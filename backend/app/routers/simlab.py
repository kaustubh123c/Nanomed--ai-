from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.ai.inference import generate_explanation, recommend_materials, predict_thickness
from app.core.deps import get_current_user, get_optional_user
from app.core.material_resolver import resolve_material
from app.db.database import repository
from app.models.user import UserOut
from app.physics.engine import get_detector_efficiency, run_beer_lambert, thickness_for_target_absorption

router = APIRouter(prefix="/api/simlab", tags=["Sim Lab"])


class SimulationRequest(BaseModel):
    material_id: str
    detector: str
    gamma_source: str
    energy_kev: float = Field(..., gt=0)
    thickness_cm: float = Field(..., gt=0)
    target_absorption_percent: float = Field(70, gt=0, lt=100)
    initial_counts: float = Field(10000, gt=0)


def _attenuation_curve(*, atomic_number, atomic_mass, density, energy_kev, max_thickness_cm, initial_counts, detector_efficiency):
    points = 25
    values = []
    for i in range(points):
        thickness = max_thickness_cm * i / (points - 1)
        r = run_beer_lambert(atomic_number=atomic_number, atomic_mass=atomic_mass, density_g_cm3=density, energy_kev=energy_kev, thickness_cm=thickness, initial_counts=initial_counts, detector_efficiency=detector_efficiency)
        values.append({"thickness_cm": round(thickness, 5), "transmission_percent": round(r.transmission * 100, 4), "absorption_percent": round(r.absorption_percent, 4), "final_counts": round(r.final_counts, 2)})
    return values


@router.post("/run")
async def run_simulation(payload: SimulationRequest, current_user: UserOut | None = Depends(get_optional_user)):
    material = await resolve_material(payload.material_id, current_user)
    efficiency = get_detector_efficiency(payload.detector)

    result = run_beer_lambert(
        atomic_number=material["atomic_number"],
        atomic_mass=material["atomic_mass"],
        density_g_cm3=material["density"],
        energy_kev=payload.energy_kev,
        thickness_cm=payload.thickness_cm,
        initial_counts=payload.initial_counts,
        detector_efficiency=efficiency,
    )

    # Live AI recommendation: is the current thickness close to optimal for
    # the researcher's stated target absorption? Surfaced in the Sim Lab
    # right-hand results panel.
    top_materials = recommend_materials(
        target_absorption_percent=payload.target_absorption_percent,
        energy_kev=payload.energy_kev,
        detector=payload.detector,
        top_n=3,
    )

    ai_thickness = predict_thickness(
        atomic_number=material["atomic_number"],
        atomic_mass=material["atomic_mass"],
        density=material["density"],
        energy_kev=payload.energy_kev,
        target_absorption_percent=payload.target_absorption_percent,
    )

    explanation = generate_explanation(
        material_name=material["name"],
        atomic_number=material["atomic_number"],
        density=material["density"],
        energy_kev=payload.energy_kev,
        thickness_cm=payload.thickness_cm,
        absorption_percent=result.absorption_percent,
        comparison_material=top_materials[0] if top_materials else None,
    )

    history_doc = {
        "owner_id": current_user.id if current_user else None,
        "material_id": payload.material_id,
        "material_name": material["name"],
        "detector": payload.detector,
        "gamma_source": payload.gamma_source,
        "energy_kev": payload.energy_kev,
        "thickness_cm": payload.thickness_cm,
        "absorption_percent": result.absorption_percent,
        "final_counts": result.final_counts,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if current_user:
        await repository.insert_one("simulation_history", history_doc)

    return {
        "material_name": material["name"],
        "initial_counts": payload.initial_counts,
        "final_counts": round(result.final_counts, 1),
        "transmission_percent": round(result.transmission * 100, 3),
        "absorption_percent": round(result.absorption_percent, 3),
        "linear_attenuation_coefficient": round(result.linear_attenuation_coefficient, 5),
        "mass_attenuation_coefficient": round(result.mass_attenuation_coefficient, 5),
        "half_value_layer_cm": round(result.half_value_layer_cm, 5),
        "mean_free_path_cm": round(result.mean_free_path_cm, 5),
        "detector_efficiency": efficiency,
        "ai_prediction": {
            "estimated_thickness_cm": round(ai_thickness["thickness_cm"], 5),
            "source": ai_thickness.get("source", "physics_engine"),
            "confidence": ai_thickness.get("confidence"),
        },
        "ai_recommendation": {
            "is_near_target": abs(result.absorption_percent - payload.target_absorption_percent) < 5,
            "top_alternative_materials": top_materials,
        },
        "ai_explanation": explanation,
        "target_absorption_percent": payload.target_absorption_percent,
        "target_thickness_cm": round(thickness_for_target_absorption(
            atomic_number=material["atomic_number"], atomic_mass=material["atomic_mass"],
            density_g_cm3=material["density"], energy_kev=payload.energy_kev,
            target_absorption_percent=payload.target_absorption_percent,
        ), 5),
        "attenuation_curve": _attenuation_curve(
            atomic_number=material["atomic_number"], atomic_mass=material["atomic_mass"],
            density=material["density"], energy_kev=payload.energy_kev,
            max_thickness_cm=max(payload.thickness_cm, 1.0), initial_counts=payload.initial_counts,
            detector_efficiency=efficiency,
        ),
    }


@router.get("/history")
async def simulation_history(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("simulation_history", {"owner_id": current_user.id})
    return docs[-25:][::-1]


class SimulationSweepRequest(BaseModel):
    material_id: str
    detector: str
    gamma_source: str
    energy_kev: float = Field(..., gt=0)
    min_thickness_cm: float = Field(0, ge=0)
    max_thickness_cm: float = Field(..., gt=0)
    steps: int = Field(25, ge=2, le=200)
    initial_counts: float = Field(10000, gt=0)


@router.post("/sweep")
async def simulation_sweep(payload: SimulationSweepRequest, current_user: UserOut | None = Depends(get_optional_user)):
    material = await resolve_material(payload.material_id, current_user)
    if payload.min_thickness_cm >= payload.max_thickness_cm:
        raise HTTPException(status_code=400, detail="min_thickness_cm must be less than max_thickness_cm")
    efficiency = get_detector_efficiency(payload.detector)
    points = []
    for i in range(payload.steps):
        thickness = payload.min_thickness_cm + (payload.max_thickness_cm - payload.min_thickness_cm) * i / (payload.steps - 1)
        r = run_beer_lambert(atomic_number=material["atomic_number"], atomic_mass=material["atomic_mass"], density_g_cm3=material["density"], energy_kev=payload.energy_kev, thickness_cm=thickness, initial_counts=payload.initial_counts, detector_efficiency=efficiency)
        points.append({"thickness_cm": round(thickness, 6), "transmission_percent": round(r.transmission * 100, 4), "absorption_percent": round(r.absorption_percent, 4), "final_counts": round(r.final_counts, 2)})
    return {"material_name": material["name"], "energy_kev": payload.energy_kev, "detector": payload.detector, "points": points}
