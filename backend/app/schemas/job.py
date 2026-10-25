from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.error import ErrorDetail


class SceneInput(BaseModel):
    text: str = Field(..., min_length=1, description="Narration text for this scene")
    visual_hint: Optional[str] = Field(None, description="Keywords or description for footage")
    start_time: Optional[float] = Field(None, ge=0.0, description="Optional explicit start timestamp")
    end_time: Optional[float] = Field(None, ge=0.0, description="Optional explicit end timestamp")


class CaptionsConfig(BaseModel):
    burn_in: bool = Field(default=True, description="Whether to hardcode subtitles onto video frames")
    srt: bool = Field(default=True, description="Whether to export .srt file")


class CreateJobRequest(BaseModel):
    audio_url: Optional[str] = Field(None, description="Public URL to pre-recorded voiceover audio")
    script: Optional[str] = Field(None, description="Written script for speech synthesis")
    scenes: Optional[List[SceneInput]] = Field(None, description="Pre-structured IncuBrix scene list")
    voice: str = Field(default="en-US-AriaNeural", description="Voice identifier for TTS")
    aspect_ratios: List[str] = Field(
        default=["16:9"],
        description="Target video aspect ratios, e.g. ['16:9', '9:16', '1:1']",
    )
    style: str = Field(
        default="bright, modern, real-world footage",
        description="Visual style guideline for footage search",
    )
    avoid: List[str] = Field(
        default_factory=list,
        description="Disallowed visual concepts or aesthetics",
    )
    captions: CaptionsConfig = Field(
        default_factory=CaptionsConfig,
        description="Subtitles & caption settings",
    )
    project_name: Optional[str] = Field(
        default="Untitled Video Project",
        description="Human-friendly project title",
    )
    visual_source: str = Field(
        default="ai_images",
        description="Preferred visual footage source: 'ai_images', 'stock_footage', or 'auto'",
    )
    callback_url: Optional[str] = Field(
        None,
        description="Optional webhook URL to notify on job completion",
    )

    @model_validator(mode="after")
    def validate_inputs(self) -> "CreateJobRequest":
        # Check that either script, audio_url, or scenes is provided
        has_script = bool(self.script and self.script.strip())
        has_audio = bool(self.audio_url and self.audio_url.strip())
        has_scenes = bool(self.scenes and len(self.scenes) > 0)

        if not (has_script or has_audio or has_scenes):
            raise ValueError("At least one of 'script', 'audio_url', or 'scenes' must be provided.")

        # Validate aspect ratios
        valid_ratios = {"16:9", "9:16", "1:1"}
        for ratio in self.aspect_ratios:
            if ratio not in valid_ratios:
                raise ValueError(f"Invalid aspect ratio '{ratio}'. Supported: {sorted(list(valid_ratios))}")

        return self


class ReplaceSceneRequest(BaseModel):
    query: Optional[str] = Field(None, description="Search query or keyword override")
    visual_hint: Optional[str] = Field(None, description="Visual description override")
    ai_prompt: Optional[str] = Field(None, description="Prompt for AI image generation")
    provider: Optional[str] = Field(None, description="Preferred footage provider ('ai_image_generator', 'pexels', 'pixabay', 'local_fallback')")
    custom_media_url: Optional[str] = Field(None, description="Direct URL to custom video/image clip")
    rerender: bool = Field(default=True, description="Whether to trigger video rerendering immediately")


class JobResponse(BaseModel):
    job_id: str
    project_name: str
    status: str  # queued, running, succeeded, failed
    progress: int = Field(ge=0, le=100)
    stage: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    aspect_ratios: List[str]
    scene_count: int = 0
    visual_source: str = "ai_images"
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    days_remaining: Optional[int] = None
    result_urls: Dict[str, Optional[str]] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    error: Optional[ErrorDetail] = None

    model_config = ConfigDict(from_attributes=True)
