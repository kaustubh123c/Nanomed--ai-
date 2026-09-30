from fastapi import APIRouter, Depends, HTTPException

from app.ai.train import ARTIFACTS_DIR, train_all
from app.core.deps import require_role
from app.db.database import repository
from app.models.user import UserOut, UserRole

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users")
async def list_users(current_user: UserOut = Depends(require_role(UserRole.ADMIN))):
    users = await repository.find("users")
    return [
        {
            "id": u["_id"],
            "full_name": u["full_name"],
            "email": u["email"],
            "role": u["role"],
            "organization": u.get("organization"),
        }
        for u in users
    ]


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: str, current_user: UserOut = Depends(require_role(UserRole.ADMIN))):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    deleted = await repository.delete_one("users", {"_id": user_id})
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")


@router.get("/stats")
async def platform_stats(current_user: UserOut = Depends(require_role(UserRole.ADMIN))):
    collections = ["users", "materials", "experiments", "predictions", "reports", "research_papers"]
    counts = {c: len(await repository.find(c)) for c in collections}
    return counts


@router.get("/ai-models")
async def ai_model_status(current_user: UserOut = Depends(require_role(UserRole.ADMIN))):
    import joblib

    metrics_path = ARTIFACTS_DIR / "metrics.joblib"
    if not metrics_path.exists():
        return {"trained": False, "metrics": None}
    return {"trained": True, "metrics": joblib.load(metrics_path)}


@router.post("/ai-models/retrain")
async def retrain_models(current_user: UserOut = Depends(require_role(UserRole.ADMIN))):
    """Retrains Models 1-3 on the synthetic dataset plus every experiment
    logged in the platform so far — the AI planner keeps improving as the
    lab's real experiment log grows."""
    experiments = await repository.find("experiments")
    metrics = train_all(repo_experiments=experiments)
    return {"trained": True, "metrics": metrics}
