from typing import List, Optional
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = Field(default="", max_length=2000)
    status: str = Field(default="Draft", max_length=30)
    material_id: Optional[str] = None
    energy_kev: Optional[float] = Field(default=None, gt=0)
    tags: List[str] = Field(default_factory=list)

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    description: Optional[str] = Field(default=None, max_length=2000)
    status: Optional[str] = Field(default=None, max_length=30)
    material_id: Optional[str] = None
    energy_kev: Optional[float] = Field(default=None, gt=0)
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    tags: Optional[List[str]] = None

class ProjectOut(BaseModel):
    id: str
    owner_id: str
    name: str
    description: str = ""
    status: str
    material_id: Optional[str] = None
    material_name: Optional[str] = None
    energy_kev: Optional[float] = None
    progress: int = 0
    tags: List[str] = []
    created_at: str
    updated_at: str

class ChecklistUpdate(BaseModel):
    items: List[bool] = Field(default_factory=list)

class DataImportOut(BaseModel):
    id: str
    filename: str
    rows: int
    columns: int
    columns_list: List[str]
    preview: List[dict]
    project_id: Optional[str] = None
    created_at: str
