from fastapi import HTTPException

from app.ai.materials_seed import DEFAULT_MATERIALS
from app.db.database import repository
from app.models.user import UserOut


async def resolve_material(material_id: str, current_user: UserOut | None = None) -> dict:
    if material_id.startswith("seed-"):
        try:
            idx = int(material_id.split("-")[1])
            material = DEFAULT_MATERIALS[idx]
        except (ValueError, IndexError):
            raise HTTPException(status_code=404, detail="Material not found")
        return {**material, "_id": material_id, "owner_id": None}

    if current_user is None:
        raise HTTPException(status_code=401, detail="Authentication required for custom materials")

    doc = await repository.find_one("materials", {"_id": material_id, "owner_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Material not found")
    return doc
