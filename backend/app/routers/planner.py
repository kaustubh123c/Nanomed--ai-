from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.ai.inference import (
    generate_explanation,
    predict_absorption,
    predict_counts,
    predict_thickness,
    recommend_materials,
)
from app.core.deps import get_current_user
from app.core.material_resolver import resolve_material
from app.db.database import repository
from app.models.prediction import (
    AbsorptionPredictionRequest,
    CountsPredictionRequest,
    PlannerRequest,
    ThicknessPredictionRequest,
)
from app.models.user import UserOut

router = APIRouter(prefix="/api/planner", tags=["AI Experiment Planner"])


@router.post("/predict-thickness")
async def api_predict_thickness(payload: ThicknessPredictionRequest, current_user: UserOut = Depends(get_current_user)):
    """Model 1."""
    material = await resolve_material(payload.material_id, current_user)
    result = predict_thickness(
        atomic_number=material["atomic_number"],
        atomic_mass=material["atomic_mass"],
        density=material["density"],
        energy_kev=payload.energy_kev,
        target_absorption_percent=payload.target_absorption_percent,
    )
    return {"material_name": material["name"], **result}


@router.post("/predict-absorption")
async def api_predict_absorption(payload: AbsorptionPredictionRequest, current_user: UserOut = Depends(get_current_user)):
    """Model 2."""
    material = await resolve_material(payload.material_id, current_user)
    result = predict_absorption(
        atomic_number=material["atomic_number"],
        atomic_mass=material["atomic_mass"],
        density=material["density"],
        energy_kev=payload.energy_kev,
        thickness_cm=payload.thickness_cm,
    )
    return {"material_name": material["name"], **result}


@router.post("/predict-counts")
async def api_predict_counts(payload: CountsPredictionRequest, current_user: UserOut = Depends(get_current_user)):
    """Model 3."""
    material = await resolve_material(payload.material_id, current_user)
    result = predict_counts(
        atomic_number=material["atomic_number"],
        atomic_mass=material["atomic_mass"],
        density=material["density"],
        energy_kev=payload.energy_kev,
        thickness_cm=payload.thickness_cm,
        detector=payload.detector,
        initial_counts=payload.initial_counts,
    )
    return {"material_name": material["name"], **result}


@router.post("/plan")
async def plan_experiment(payload: PlannerRequest, current_user: UserOut = Depends(get_current_user)):
    """The flagship AI Experiment Planner endpoint.

    Answers "what attenuation do you want to achieve?" — runs Model 4
    (Material Recommendation Engine) to rank the catalogue, then Models 1-3
    to fully specify the top recommendation (thickness / absorption /
    expected counts), then Model 5 (AI Scientist) to narrate the reasoning.
    """
    ranked = recommend_materials(
        target_absorption_percent=payload.target_absorption_percent,
        energy_kev=payload.energy_kev,
        detector=payload.detector,
        top_n=5,
    )

    if payload.preferred_material_id:
        preferred = await resolve_material(payload.preferred_material_id, current_user)
        top_choice_material = preferred
    else:
        # Re-resolve full material record for the top-ranked recommendation
        from app.ai.materials_seed import DEFAULT_MATERIALS

        top_choice_material = next(
            (m for m in DEFAULT_MATERIALS if m["name"] == ranked[0]["material_name"]), DEFAULT_MATERIALS[0]
        )

    thickness_result = predict_thickness(
        atomic_number=top_choice_material["atomic_number"],
        atomic_mass=top_choice_material["atomic_mass"],
        density=top_choice_material["density"],
        energy_kev=payload.energy_kev,
        target_absorption_percent=payload.target_absorption_percent,
    )
    absorption_result = predict_absorption(
        atomic_number=top_choice_material["atomic_number"],
        atomic_mass=top_choice_material["atomic_mass"],
        density=top_choice_material["density"],
        energy_kev=payload.energy_kev,
        thickness_cm=thickness_result["thickness_cm"],
    )
    counts_result = predict_counts(
        atomic_number=top_choice_material["atomic_number"],
        atomic_mass=top_choice_material["atomic_mass"],
        density=top_choice_material["density"],
        energy_kev=payload.energy_kev,
        thickness_cm=thickness_result["thickness_cm"],
        detector=payload.detector,
        initial_counts=10000,
    )

    explanation = generate_explanation(
        material_name=top_choice_material["name"],
        atomic_number=top_choice_material["atomic_number"],
        density=top_choice_material["density"],
        energy_kev=payload.energy_kev,
        thickness_cm=thickness_result["thickness_cm"],
        absorption_percent=absorption_result["absorption_percent"],
        comparison_material=ranked[1] if len(ranked) > 1 else None,
    )

    response = {
        "recommended_material": top_choice_material["name"],
        "recommended_thickness_cm": round(thickness_result["thickness_cm"], 5),
        "expected_absorption_percent": round(absorption_result["absorption_percent"], 3),
        "expected_counts": round(counts_result["final_counts"], 1),
        "confidence_score": round(
            (thickness_result["confidence"] + absorption_result["confidence"] + counts_result["confidence"]) / 3, 3
        ),
        "alternative_materials": ranked,
        "scientific_explanation": explanation,
    }

    prediction_doc = {
        "owner_id": current_user.id,
        "type": "planner",
        "request": payload.model_dump(),
        "response": response,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await repository.insert_one("predictions", prediction_doc)

    return response
