from typing import Optional

from pydantic import BaseModel


class ReportCreateRequest(BaseModel):
    experiment_id: Optional[str] = None
    simulation_snapshot: Optional[dict] = None
    title: Optional[str] = None


class ReportOut(BaseModel):
    id: str
    title: str
    experiment_id: Optional[str] = None
    created_at: str
    owner_id: Optional[str] = None
    file_path: str
