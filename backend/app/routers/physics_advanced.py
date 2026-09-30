"""Advanced radiation-shielding calculator API."""
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from app.core.config import settings
from app.core.deps import get_current_user
from app.core.material_resolver import resolve_material
from app.db.database import repository
from app.models.user import UserOut
from app.physics.advanced import service
from app.physics.advanced.components import VALID_SOURCES
from app.physics.advanced.energy_grid import get_selected_energy_grid

router = APIRouter(prefix="/api/calculators/advanced", tags=["Advanced Physics"])

def _resolve_source(data_source: Optional[str]) -> str:
    source = data_source or settings.MAC_DATA_SOURCE
    if source not in VALID_SOURCES:
        raise HTTPException(status_code=400, detail=f"data_source must be one of {list(VALID_SOURCES)}")
    return source

class AdvancedCalculationRequest(BaseModel):
    composition_mode: str = "formula"
    formula: Optional[str] = Field(None, min_length=1, max_length=500)
    material_id: Optional[str] = None
    weight_fractions: Optional[Dict[str, float]] = None
    mole_fractions: Optional[Dict[str, float]] = None
    density_g_cm3: float = Field(..., gt=0)
    thickness_cm: float = Field(..., ge=0)
    energy_MeV: float = Field(..., gt=0)
    data_source: Optional[str] = None
    save_result: bool = True
    notes: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="after")
    def validate_composition(self):
        if self.material_id:
            return self
        if self.composition_mode not in ("formula", "weight", "mole"):
            raise ValueError("composition_mode must be 'formula', 'weight', or 'mole'")
        if self.composition_mode == "formula" and not self.formula:
            raise ValueError("formula is required when composition_mode is 'formula'")
        if self.composition_mode == "weight" and not self.weight_fractions:
            raise ValueError("weight_fractions is required when composition_mode is 'weight'")
        if self.composition_mode == "mole" and not self.mole_fractions:
            raise ValueError("mole_fractions is required when composition_mode is 'mole'")
        return self

async def _calculate(payload: AdvancedCalculationRequest, current_user: UserOut):
    source = _resolve_source(payload.data_source)
    formula = payload.formula
    density = payload.density_g_cm3
    material_name = None
    material_id = payload.material_id
    if material_id:
        material = await resolve_material(material_id, current_user)
        formula = material["formula"]
        density = material["density"]
        material_name = material["name"]
    try:
        result = service.calculate_shielding(
            formula=formula, density_g_cm3=density, thickness_cm=payload.thickness_cm,
            energy_mev=payload.energy_MeV, data_source=source,
            composition_mode=payload.composition_mode,
            weight_fractions=payload.weight_fractions, mole_fractions=payload.mole_fractions,
        )
    except (ValueError, KeyError, LookupError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    result["material_id"] = material_id
    result["material_name"] = material_name
    if payload.save_result:
        doc = {
            "owner_id": current_user.id, "material_id": material_id,
            "material_name": material_name or formula, "formula": formula,
            "energy_MeV": payload.energy_MeV, "density_g_cm3": density,
            "thickness_cm": payload.thickness_cm, "data_source": source,
            "result": result, "notes": payload.notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        saved = await repository.insert_one("calculation_history", doc)
        result["calculation_id"] = saved["_id"]
    return result

@router.post("")
async def calculate_advanced(payload: AdvancedCalculationRequest, current_user: UserOut = Depends(get_current_user)):
    return await _calculate(payload, current_user)

class AdvancedSweepRequest(BaseModel):
    formula: Optional[str] = Field(None, min_length=1, max_length=500)
    material_id: Optional[str] = None
    density_g_cm3: float = Field(..., gt=0)
    thickness_cm: float = Field(..., ge=0)
    energies_MeV: Optional[List[float]] = None
    data_source: Optional[str] = None

@router.post("/sweep")
async def calculate_advanced_sweep(payload: AdvancedSweepRequest, current_user: UserOut = Depends(get_current_user)):
    source = _resolve_source(payload.data_source)
    formula = payload.formula
    density = payload.density_g_cm3
    if payload.material_id:
        material = await resolve_material(payload.material_id, current_user)
        formula, density = material["formula"], material["density"]
    if not formula:
        raise HTTPException(status_code=400, detail="formula or material_id is required")
    if payload.energies_MeV:
        if len(payload.energies_MeV) > 200: raise HTTPException(status_code=400, detail="Maximum 200 energy points")
        if any(e <= 0 for e in payload.energies_MeV): raise HTTPException(status_code=400, detail="All energies must be positive")
    try:
        return service.calculate_energy_sweep(formula=formula, density_g_cm3=density, thickness_cm=payload.thickness_cm, energies_mev=payload.energies_MeV, data_source=source)
    except (ValueError, KeyError, LookupError, RuntimeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))



class MultiMaterialElement(BaseModel):
    element: str = Field(..., min_length=1, max_length=3)
    weight_fraction: float = Field(..., gt=0, le=100)


class MultiMaterialSweepRequest(BaseModel):
    elements: List[MultiMaterialElement] = Field(..., min_length=1, max_length=8)
    density_g_cm3: float = Field(..., gt=0)
    thickness_cm: float = Field(..., ge=0)
    energies_MeV: List[float] = Field(..., min_length=1, max_length=200)
    data_source: Optional[str] = None

    @model_validator(mode="after")
    def validate_inputs(self):
        symbols = [e.element.strip().capitalize() for e in self.elements]
        if len(set(symbols)) != len(symbols):
            raise ValueError("Each element can appear only once.")
        if any(e <= 0 for e in self.energies_MeV):
            raise ValueError("All energy levels must be greater than zero.")
        total = sum(e.weight_fraction for e in self.elements)
        if abs(total - 100.0) > 0.01:
            raise ValueError(f"Element weight fractions must total 100%. Current total: {total:.2f}%")
        for item, symbol in zip(self.elements, symbols):
            item.element = symbol
        return self


@router.post("/multi-material-sweep")
async def calculate_multi_material_sweep(
    payload: MultiMaterialSweepRequest,
    current_user: UserOut = Depends(get_current_user),
):
    source = _resolve_source(payload.data_source)
    fractions = {item.element: item.weight_fraction / 100.0 for item in payload.elements}
    results = []
    for index, energy in enumerate(payload.energies_MeV, start=1):
        try:
            calc = service.calculate_shielding(
                composition_mode="weight",
                weight_fractions=fractions,
                density_g_cm3=payload.density_g_cm3,
                thickness_cm=payload.thickness_cm,
                energy_mev=energy,
                data_source=source,
            )
            results.append({
                "index": index,
                "energy_MeV": energy,
                "status": "calculated",
                "mac_cm2_g": calc.get("mac_cm2_g"),
                "lac_cm1": calc.get("lac_cm1"),
                "hvl_cm": calc.get("hvl_cm"),
                "tvl_cm": calc.get("tvl_cm"),
                "mfp_cm": calc.get("mfp_cm"),
                "rse_percent": calc.get("rse_percent"),
                "zeff": calc.get("zeff"),
                "zeq": calc.get("zeq"),
                "ebf": calc.get("ebf"),
                "eabf": calc.get("eabf"),
                "mass_fractions": calc.get("mass_fractions"),
            })
        except (ValueError, KeyError, LookupError, ZeroDivisionError, RuntimeError) as exc:
            results.append({"index": index, "energy_MeV": energy, "status": "unavailable", "error": str(exc)})

    calculated = sum(1 for item in results if item["status"] == "calculated")
    return {
        "elements": [{"element": e.element, "weight_fraction_percent": e.weight_fraction} for e in payload.elements],
        "density_g_cm3": payload.density_g_cm3,
        "thickness_cm": payload.thickness_cm,
        "energy_count": len(payload.energies_MeV),
        "calculated_count": calculated,
        "unavailable_count": len(results) - calculated,
        "data_source": source,
        "results": results,
    }

@router.get("/history")
async def calculator_history(current_user: UserOut = Depends(get_current_user)):
    docs = await repository.find("calculation_history", {"owner_id": current_user.id})
    return docs[-50:][::-1]

@router.get("/energy-grid")
async def energy_grid(current_user: UserOut = Depends(get_current_user)):
    return {"energies_MeV": get_selected_energy_grid()}

@router.get("/material/{material_id}")
async def calculate_for_material(material_id: str, thickness_cm: float, energy_MeV: float, data_source: Optional[str] = None, current_user: UserOut = Depends(get_current_user)):
    material = await resolve_material(material_id, current_user)
    source = _resolve_source(data_source)
    try:
        return service.calculate_shielding(formula=material["formula"], density_g_cm3=material["density"], thickness_cm=thickness_cm, energy_mev=energy_MeV, data_source=source)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
