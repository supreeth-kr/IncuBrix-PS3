import uuid
from typing import Any, List, Optional
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    scene_index: Mapped[int] = mapped_column(Integer, index=True)

    narration_text: Mapped[str] = mapped_column(Text)
    start_time: Mapped[float] = mapped_column(Float)
    end_time: Mapped[float] = mapped_column(Float)
    duration: Mapped[float] = mapped_column(Float)

    clip_identifier: Mapped[str] = mapped_column(String(255))
    source_provider: Mapped[str] = mapped_column(String(64))  # "pexels", "pixabay", "local_fallback"
    source_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    source_asset_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    license_name: Mapped[str] = mapped_column(String(255))
    license_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    attribution: Mapped[str] = mapped_column(Text, default="")
    commercial_use_status: Mapped[str] = mapped_column(String(64), default="unverified")
    rights_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    selection_reason: Mapped[str] = mapped_column(Text, default="")
    relevance_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    scoring_method: Mapped[str] = mapped_column(String(64), default="semantic_visual_match")
    visual_hint: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    warnings: Mapped[List[str]] = mapped_column(JSON, default=list)

    job: Mapped["Job"] = relationship("Job", back_populates="scenes")
