from typing import List, Optional
from pydantic import BaseModel, Field


class TimelineSceneItem(BaseModel):
    scene_id: str
    scene_index: int
    narration_text: str
    start_time: float
    end_time: float
    duration: float
    clip_identifier: str
    source_provider: str
    source_url: Optional[str] = None
    licence_name: str
    licence_url: Optional[str] = None
    attribution: str
    commercial_use_status: str
    rights_verified: bool
    ai_generated: bool
    selection_reason: str
    relevance_score: Optional[float] = None
    warnings: List[str] = Field(default_factory=list)


class TimelineDocument(BaseModel):
    job_id: str
    total_scenes: int
    total_duration_seconds: float
    scenes: List[TimelineSceneItem]
