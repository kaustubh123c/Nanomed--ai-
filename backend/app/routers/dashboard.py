from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.db.database import repository
from app.models.user import UserOut

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def summary(current_user: UserOut = Depends(get_current_user)):
    """Counts + recents for the dashboard cards and charts.

    Materials/Experiments/Predictions/Research Papers/Reports modules are
    built in later steps of this build-out; the endpoint already returns
    their real (currently zero) counts so the dashboard UI never needs a
    second wiring pass.
    """
    experiments = await repository.find("experiments", {"owner_id": current_user.id})
    materials = await repository.find("materials", {"owner_id": current_user.id})
    predictions = await repository.find("predictions", {"owner_id": current_user.id})
    papers = await repository.find("research_papers", {"owner_id": current_user.id})
    reports = await repository.find("reports", {"owner_id": current_user.id})

    return {
        "cards": {
            "total_experiments": len(experiments),
            "materials": len(materials),
            "predictions": len(predictions),
            "research_papers": len(papers),
            "reports": len(reports),
        },
        "recent_experiments": experiments[-5:][::-1],
        "recent_predictions": predictions[-5:][::-1],
    }
