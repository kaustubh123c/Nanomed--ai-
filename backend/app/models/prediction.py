from typing import Optional

from pydantic import BaseModel, Field


class ThicknessPredictionRequest(BaseModel):
    material_id: str
    energy_kev: float = Field(..., gt=0)
    target_absorption_percent: float = Field(..., gt=0, lt=100)


class AbsorptionPredictionRequest(BaseModel):
    material_id: str
    energy_kev: float = Field(..., gt=0)
    thickness_cm: float = Field(..., gt=0)


class CountsPredictionRequest(BaseModel):
    material_id: str
    energy_kev: float = Field(..., gt=0)
    thickness_cm: float = Field(..., gt=0)
    detector: str
    initial_counts: float = Field(10000, gt=0)


class PlannerRequest(BaseModel):
    energy_kev: float = Field(..., gt=0)
    target_absorption_percent: float = Field(..., gt=0, lt=100)
    detector: str
    preferred_material_id: Optional[str] = None
