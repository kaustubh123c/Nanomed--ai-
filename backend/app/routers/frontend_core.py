from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.core.deps import get_current_user
from app.db.database import repository
from app.models.user import UserOut

router = APIRouter(prefix="/api/frontend-core", tags=["Frontend Core"])

def now(): return datetime.now(timezone.utc).isoformat()

class HistoryCreate(BaseModel):
    material: str
    formula: str | None = None
    energy: float | None = None
    density: float | None = None
    thickness: float | None = None
    result: dict[str, Any] = Field(default_factory=dict)


@router.get("/history")
async def list_history(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("calculation_history", {"owner_id": current_user.id})
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return [{"id": d["_id"], **{k:d.get(k) for k in ["material","formula","energy","density","thickness","result","created_at","favorite"]}} for d in docs[:100]]

@router.post("/history")
async def create_history(payload: HistoryCreate, current_user: UserOut = Depends(get_current_user)):
    doc = {**payload.model_dump(), "owner_id": current_user.id, "favorite": False, "created_at": now()}
    return await repository.insert_one("calculation_history", doc)

@router.patch("/history/{item_id}")
async def update_history(item_id: str, payload: dict, current_user: UserOut = Depends(get_current_user)):
    allowed = {k:v for k,v in payload.items() if k in {"favorite"}}
    doc = await repository.update_one("calculation_history", {"_id":item_id,"owner_id":current_user.id}, allowed)
    if not doc: raise HTTPException(404, "History item not found")
    return doc

@router.delete("/history/{item_id}")
async def delete_history(item_id: str, current_user: UserOut = Depends(get_current_user)):
    if not await repository.delete_one("calculation_history", {"_id":item_id,"owner_id":current_user.id}): raise HTTPException(404,"History item not found")
    return {"ok":True}

@router.delete("/history")
async def clear_history(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("calculation_history", {"owner_id":current_user.id})
    for d in docs: await repository.delete_one("calculation_history", {"_id":d["_id"],"owner_id":current_user.id})
    return {"deleted":len(docs)}

