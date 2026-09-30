from typing import Optional

from pydantic import BaseModel, Field


class ExperimentBase(BaseModel):
    experiment_name: str = Field(..., min_length=2, max_length=150)
    material_id: str
    detector: str
    gamma_source: str
    energy_kev: float = Field(..., gt=0)
    initial_counts: float = Field(..., gt=0)
    final_counts: Optional[float] = Field(None, ge=0)
    thickness_cm: float = Field(..., gt=0)
    temperature_c: Optional[float] = None
    pressure_kpa: Optional[float] = None
    notes: Optional[str] = None


class ExperimentCreate(ExperimentBase):
    pass


class ExperimentOut(ExperimentBase):
    id: str
    owner_id: Optional[str] = None
    material_name: Optional[str] = None
    absorption_percent: Optional[float] = None
    linear_attenuation_coeff: Optional[float] = None
    mass_attenuation_coeff: Optional[float] = None
    created_at: Optional[str] = None
