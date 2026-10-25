from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_name: Mapped[str] = mapped_column(String(255), default="Untitled Video Project")
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)

    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    stage: Mapped[str] = mapped_column(String(64), default="queued")

    script: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    audio_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    audio_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    voice: Mapped[str] = mapped_column(String(64), default="en-US-AriaNeural")

    aspect_ratios: Mapped[List[str]] = mapped_column(JSON, default=lambda: ["16:9"])
    style: Mapped[str] = mapped_column(String(255), default="bright, modern, real-world footage")
    avoid: Mapped[List[str]] = mapped_column(JSON, default=list)
    captions_config: Mapped[Dict[str, Any]] = mapped_column(
        JSON, default=lambda: {"burn_in": True, "srt": True}
    )
    callback_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    visual_source: Mapped[str] = mapped_column(String(64), default="ai_images")
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)

    warnings: Mapped[List[str]] = mapped_column(JSON, default=list)
    cost_estimate: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=lambda: {
            "estimated_usd": 0.0,
            "currency": "USD",
            "basis": "Free tier / local deterministic rendering",
        },
    )
    output_files: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    scenes: Mapped[List["Scene"]] = relationship(
        "Scene",
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="Scene.scene_index",
        lazy="selectin",
    )
