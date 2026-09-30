from collections import Counter, defaultdict

from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.db.database import repository
from app.models.user import UserOut

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview")
async def analytics_overview(current_user: UserOut = Depends(get_current_user)):
    experiments = await repository.find("experiments", {"owner_id": current_user.id})
    predictions = await repository.find("predictions", {"owner_id": current_user.id})

    material_counts = Counter(e.get("material_name", "Unknown") for e in experiments)
    detector_counts = Counter(e.get("detector", "Unknown") for e in experiments)

    energy_buckets = defaultdict(int)
    for e in experiments:
        energy = e.get("energy_kev", 0)
        bucket = f"{int(energy // 100) * 100}-{int(energy // 100) * 100 + 100} keV"
        energy_buckets[bucket] += 1

    experiment_trend = defaultdict(int)
    for e in experiments:
        day = (e.get("created_at") or "")[:10]
        if day:
            experiment_trend[day] += 1

    accuracy_points = []
    for p in predictions:
        if "actual_absorption_percent" in p and p.get("actual_absorption_percent") is not None:
            accuracy_points.append(
                {
                    "predicted": p.get("predicted_absorption_percent"),
                    "actual": p.get("actual_absorption_percent"),
                }
            )

    mae = None
    if accuracy_points:
        errors = [abs(pt["predicted"] - pt["actual"]) for pt in accuracy_points if pt["predicted"] is not None]
        if errors:
            mae = sum(errors) / len(errors)

    return {
        "material_comparison": [{"material": k, "count": v} for k, v in material_counts.most_common()],
        "detector_usage": [{"detector": k, "count": v} for k, v in detector_counts.most_common()],
        "gamma_energy_distribution": [
            {"bucket": k, "count": v} for k, v in sorted(energy_buckets.items())
        ],
        "experiment_trend": [{"date": k, "count": v} for k, v in sorted(experiment_trend.items())],
        "prediction_accuracy": {
            "points": accuracy_points[-50:],
            "mean_absolute_error_percent": round(mae, 3) if mae is not None else None,
        },
    }
