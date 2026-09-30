from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.ai.inference import predict_absorption, predict_counts
from app.core.deps import get_current_user
from app.core.material_resolver import resolve_material
from app.db.database import repository
from app.models.experiment import ExperimentCreate, ExperimentOut
from app.models.user import UserOut
from app.physics.engine import run_beer_lambert

router = APIRouter(prefix="/api/experiments", tags=["Experiments"])


def _to_out(doc: dict) -> ExperimentOut:
    return ExperimentOut(
        id=doc["_id"],
        owner_id=doc.get("owner_id"),
        material_name=doc.get("material_name"),
        absorption_percent=doc.get("absorption_percent"),
        linear_attenuation_coeff=doc.get("linear_attenuation_coeff"),
        mass_attenuation_coeff=doc.get("mass_attenuation_coeff"),
        created_at=doc.get("created_at"),
        experiment_name=doc["experiment_name"],
        material_id=doc["material_id"],
        detector=doc["detector"],
        gamma_source=doc["gamma_source"],
        energy_kev=doc["energy_kev"],
        initial_counts=doc["initial_counts"],
        final_counts=doc.get("final_counts"),
        thickness_cm=doc["thickness_cm"],
        temperature_c=doc.get("temperature_c"),
        pressure_kpa=doc.get("pressure_kpa"),
        notes=doc.get("notes"),
    )


@router.get("", response_model=list[ExperimentOut])
async def list_experiments(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("experiments", {"owner_id": current_user.id})
    return [_to_out(d) for d in docs]


@router.get("/{experiment_id}", response_model=ExperimentOut)
async def get_experiment(experiment_id: str, current_user: UserOut = Depends(get_current_user)):
    doc = await repository.find_one("experiments", {"_id": experiment_id, "owner_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return _to_out(doc)


@router.post("", response_model=ExperimentOut, status_code=status.HTTP_201_CREATED)
async def create_experiment(payload: ExperimentCreate, current_user: UserOut = Depends(get_current_user)):
    material = await resolve_material(payload.material_id, current_user)

    physics = run_beer_lambert(
        atomic_number=material["atomic_number"],
        atomic_mass=material["atomic_mass"],
        density_g_cm3=material["density"],
        energy_kev=payload.energy_kev,
        thickness_cm=payload.thickness_cm,
        initial_counts=payload.initial_counts,
    )

    doc = {
        **payload.model_dump(),
        "owner_id": current_user.id,
        "material_name": material["name"],
        "final_counts": payload.final_counts or physics.final_counts,
        "absorption_percent": physics.absorption_percent,
        "linear_attenuation_coeff": physics.linear_attenuation_coefficient,
        "mass_attenuation_coeff": physics.mass_attenuation_coefficient,
        "atomic_number": material["atomic_number"],
        "atomic_mass": material["atomic_mass"],
        "density": material["density"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    created = await repository.insert_one("experiments", doc)
    return _to_out(created)


@router.delete("/{experiment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experiment(experiment_id: str, current_user: UserOut = Depends(get_current_user)):
    deleted = await repository.delete_one("experiments", {"_id": experiment_id, "owner_id": current_user.id})
    if not deleted:
        raise HTTPException(status_code=404, detail="Experiment not found")


@router.post("/{experiment_id}/predict")
async def predict_for_experiment(experiment_id: str, current_user: UserOut = Depends(get_current_user)):
    """Runs the AI absorption + counts models against an already-logged
    experiment and stores the result in `predictions` for the Analytics
    'Prediction Accuracy' chart."""
    doc = await repository.find_one("experiments", {"_id": experiment_id, "owner_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Experiment not found")

    absorption = predict_absorption(
        atomic_number=doc["atomic_number"],
        atomic_mass=doc["atomic_mass"],
        density=doc["density"],
        energy_kev=doc["energy_kev"],
        thickness_cm=doc["thickness_cm"],
    )
    counts = predict_counts(
        atomic_number=doc["atomic_number"],
        atomic_mass=doc["atomic_mass"],
        density=doc["density"],
        energy_kev=doc["energy_kev"],
        thickness_cm=doc["thickness_cm"],
        detector=doc["detector"],
        initial_counts=doc["initial_counts"],
    )

    prediction_doc = {
        "experiment_id": experiment_id,
        "owner_id": current_user.id,
        "predicted_absorption_percent": absorption["absorption_percent"],
        "actual_absorption_percent": doc.get("absorption_percent"),
        "predicted_final_counts": counts["final_counts"],
        "actual_final_counts": doc.get("final_counts"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await repository.insert_one("predictions", prediction_doc)

    return {"absorption": absorption, "counts": counts}
