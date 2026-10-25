from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SceneResponse(BaseModel):
    id: str
    scene_index: int
    narration_text: str
    start_time: float
    end_time: float
    duration: float
    clip_identifier: str
    source_provider: str
    source_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    license_name: str
    license_url: Optional[str] = None
    attribution: str
    commercial_use_status: str
    rights_verified: bool
    ai_generated: bool
    selection_reason: str
    relevance_score: Optional[float] = None
    scoring_method: str
    visual_hint: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
