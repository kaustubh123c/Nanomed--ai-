from fastapi import APIRouter, Depends, HTTPException, status

from app.ai.materials_seed import DEFAULT_MATERIALS, DETECTORS, GAMMA_SOURCES
from app.core.deps import get_current_user, get_optional_user
from app.db.database import repository
from app.models.material import MaterialCreate, MaterialOut, MaterialUpdate
from app.models.user import UserOut

router = APIRouter(prefix="/api/materials", tags=["Materials"])


def _to_out(doc: dict) -> MaterialOut:
    return MaterialOut(id=doc["_id"], owner_id=doc.get("owner_id"), **{
        k: doc.get(k) for k in
        ["name", "formula", "density", "atomic_number", "atomic_mass",
         "particle_size_nm", "crystal_structure", "manufacturer", "research_notes"]
    })


@router.get("/reference-data")
async def reference_data():
    """Detector list + gamma source presets used across Materials, Experiments,
    Sim Lab and the AI Planner forms."""
    return {"detectors": DETECTORS, "gamma_sources": GAMMA_SOURCES}


@router.get("", response_model=list[MaterialOut])
async def list_materials(current_user: UserOut | None = Depends(get_optional_user)):
    custom = await repository.find("materials", {"owner_id": current_user.id}) if current_user else []
    seeded = [
        MaterialOut(id=f"seed-{i}", owner_id=None, **m)
        for i, m in enumerate(DEFAULT_MATERIALS)
    ]
    return seeded + [_to_out(d) for d in custom]


@router.get("/{material_id}", response_model=MaterialOut)
async def get_material(material_id: str, current_user: UserOut = Depends(get_current_user)):
    if material_id.startswith("seed-"):
        idx = int(material_id.split("-")[1])
        if idx < 0 or idx >= len(DEFAULT_MATERIALS):
            raise HTTPException(status_code=404, detail="Material not found")
        return MaterialOut(id=material_id, owner_id=None, **DEFAULT_MATERIALS[idx])

    doc = await repository.find_one("materials", {"_id": material_id, "owner_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Material not found")
    return _to_out(doc)


@router.post("", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def create_material(payload: MaterialCreate, current_user: UserOut = Depends(get_current_user)):
    doc = {**payload.model_dump(), "owner_id": current_user.id}
    created = await repository.insert_one("materials", doc)
    return _to_out(created)


@router.put("/{material_id}", response_model=MaterialOut)
async def update_material(
    material_id: str, payload: MaterialUpdate, current_user: UserOut = Depends(get_current_user)
):
    if material_id.startswith("seed-"):
        raise HTTPException(status_code=400, detail="Reference materials cannot be edited")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = await repository.update_one("materials", {"_id": material_id, "owner_id": current_user.id}, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Material not found")
    return _to_out(updated)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(material_id: str, current_user: UserOut = Depends(get_current_user)):
    if material_id.startswith("seed-"):
        raise HTTPException(status_code=400, detail="Reference materials cannot be deleted")
    deleted = await repository.delete_one("materials", {"_id": material_id, "owner_id": current_user.id})
    if not deleted:
        raise HTTPException(status_code=404, detail="Material not found")
