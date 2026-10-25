from typing import List, Optional
from fastapi import APIRouter, Depends, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.logging import get_logger
from app.core.worker import JobWorker
from app.database import get_db
from app.models.job import Job
from app.models.scene import Scene
from app.schemas.error import AppException
from app.schemas.job import ReplaceSceneRequest
from app.schemas.scene import SceneResponse

router = APIRouter(prefix="/api/v1", tags=["Scenes"])
logger = get_logger("api_scenes")


@router.get("/jobs/{job_id}/scenes", response_model=List[SceneResponse], summary="List Scenes for a Job")
async def list_job_scenes(
    job_id: str,
    db: AsyncSession = Depends(get_db),
) -> List[SceneResponse]:
    """Returns the ordered scene list with timing, narration text, and footage metadata."""
    stmt_job = select(Job).where(Job.id == job_id)
    res_job = await db.execute(stmt_job)
    if not res_job.scalars().first():
        raise AppException(status_code=404, code="JOB_NOT_FOUND", message=f"Job '{job_id}' not found.")

    stmt = select(Scene).where(Scene.job_id == job_id).order_by(Scene.scene_index)
    res = await db.execute(stmt)
    scenes = res.scalars().all()
    return scenes


@router.post(
    "/jobs/{job_id}/scenes/{scene_id}/replace",
    response_model=SceneResponse,
    summary="Replace Scene Visual Footage",
)
async def replace_scene(
    job_id: str,
    scene_id: str,
    req: ReplaceSceneRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
) -> SceneResponse:
    """
    Replaces a specific scene's visual footage and optionally rerenders the finished video.
    Preserves all other scenes and audio.
    """
    updated_scene = await JobWorker.replace_scene_and_rerender(
        job_id=job_id,
        scene_id=scene_id,
        query=req.query,
        visual_hint=req.visual_hint,
        provider_name=req.provider,
        custom_media_url=req.custom_media_url,
        rerender=req.rerender,
    )
    return updated_scene
