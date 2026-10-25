from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CostEstimate(BaseModel):
    estimated_usd: float
    currency: str = "USD"
    basis: str


class OutputFileMetadata(BaseModel):
    filename: str
    file_path: str
    aspect_ratio: Optional[str] = None
    file_size_bytes: int
    duration_seconds: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    codec_video: Optional[str] = None
    codec_audio: Optional[str] = None
    fps: Optional[float] = None
    download_url: str


class ManifestDocument(BaseModel):
    application_version: str
    job_id: str
    project_name: str
    providers: Dict[str, str]
    models: Dict[str, str]
    settings: Dict[str, Any]
    output_aspect_ratios: List[str]
    processing_start_time: str
    processing_end_time: str
    measured_duration_seconds: float
    cost_estimate: CostEstimate
    warnings: List[str]
    fallback_usage: Dict[str, Any]
    rights_and_licensing_summary: Dict[str, Any]
    output_files: Dict[str, OutputFileMetadata]
