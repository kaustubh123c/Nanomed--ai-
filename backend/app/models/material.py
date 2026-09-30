from typing import Optional

from pydantic import BaseModel, Field


class MaterialBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    formula: str = Field(..., min_length=1, max_length=50)
    density: float = Field(..., gt=0, description="g/cm^3")
    atomic_number: float = Field(..., gt=0, description="Effective atomic number Z")
    atomic_mass: float = Field(..., gt=0, description="g/mol")
    particle_size_nm: Optional[float] = Field(None, gt=0)
    crystal_structure: Optional[str] = None
    manufacturer: Optional[str] = None
    research_notes: Optional[str] = None


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    formula: Optional[str] = None
    density: Optional[float] = None
    atomic_number: Optional[float] = None
    atomic_mass: Optional[float] = None
    particle_size_nm: Optional[float] = None
    crystal_structure: Optional[str] = None
    manufacturer: Optional[str] = None
    research_notes: Optional[str] = None


class MaterialOut(MaterialBase):
    id: str
    owner_id: Optional[str] = None
