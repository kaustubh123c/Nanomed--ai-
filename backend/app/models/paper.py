from typing import List, Optional

from pydantic import BaseModel


class ResearchPaperOut(BaseModel):
    id: str
    filename: str
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    materials_mentioned: Optional[List[str]] = None
    particle_size: Optional[str] = None
    energy: Optional[str] = None
    detector: Optional[str] = None
    results: Optional[str] = None
    conclusion: Optional[str] = None
    ai_summary: Optional[str] = None
    owner_id: Optional[str] = None
    created_at: Optional[str] = None
