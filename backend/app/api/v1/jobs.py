import json
import os
import shutil
import uuid
from typing import Any, Dict, List, Optional
import aiofiles
from fastapi import APIRouter, Depends, File, Form, Header, Request, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.core.idempotency import IdempotencyManager
from app.core.logging import get_logger
from app.core.queue import JobQueue
from app.core.storage import get_storage
from app.database import get_db
from app.models.job import Job
from app.models.scene import Scene
from app.schemas.error import AppException
from app.schemas.job import CreateJobRequest, JobResponse
from app.schemas.scene import SceneResponse
from app.services.audio_transcription import AudioTranscriptionService

router = APIRouter(prefix="/api/v1", tags=["Jobs"])
logger = get_logger("api_jobs")
settings = get_settings()


def format_job_response(job: Job, scene_count: int = 0) -> JobResponse:
    err_dict = None
    if job.error_code:
        err_dict = {
            "code": job.error_code,
            "message": job.error_message or "An error occurred",
            "retryable": False,
            "details": job.error_details or {},
        }

    return JobResponse(
        job_id=job.id,
        project_name=job.project_name,
        status=job.status,
        progress=job.progress,
        stage=job.stage,
        created_at=job.created_at,
        completed_at=job.completed_at,
        aspect_ratios=job.aspect_ratios or ["16:9"],
        scene_count=scene_count,
        result_urls=job.output_files or {},
        warnings=job.warnings or [],
        error=err_dict,
    )


@router.post(
    "/broll/jobs",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=JobResponse,
    summary="Submit B-Roll Video Generation Job",
)
async def create_broll_job(
    req: CreateJobRequest,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
) -> JobResponse:
    """Submits a new video generation job. Returns HTTP 202 Accepted with job ID."""
    # 1. Idempotency Check
    if idempotency_key:
        existing = await IdempotencyManager.get_existing_job(db, idempotency_key)
        if existing:
            logger.info(f"Idempotent match for key '{idempotency_key}': returning job {existing.id}")
            response.status_code = status.HTTP_200_OK
            return format_job_response(existing, len(existing.scenes) if existing.scenes else 0)

    # 2. Input validation
    script_clean = (req.script or "").strip()
    if not script_clean and not req.audio_url and not req.scenes:
        raise AppException(
            status_code=400,
            code="INVALID_INPUT",
            message="Either 'script', 'audio_url', or 'scenes' must be provided.",
            retryable=False,
        )

    # 3. Create Job entity
    job = Job(
        project_name=req.project_name or "Untitled Video Project",
        idempotency_key=idempotency_key,
        status="queued",
        progress=0,
        stage="queued",
        script=script_clean or None,
        audio_url=req.audio_url,
        voice=req.voice,
        aspect_ratios=req.aspect_ratios,
        style=req.style,
        avoid=req.avoid,
        captions_config=req.captions.model_dump(),
        callback_url=req.callback_url,
    )

    db.add(job)
    await db.commit()
    await db.refresh(job)

    # 4. Enqueue background processing
    await JobQueue.enqueue(job.id)

    return format_job_response(job, 0)


@router.post(
    "/broll/jobs/upload",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=JobResponse,
    summary="Create B-Roll Video from Uploaded Audio File",
)
async def create_broll_job_with_audio_upload(
    file: UploadFile = File(...),
    project_name: str = Form("Audio Voiceover Project"),
    script: Optional[str] = Form(None),
    aspect_ratios: str = Form('["16:9"]'),
    style: str = Form("bright, modern, real-world footage"),
    avoid: str = Form("[]"),
    burn_in_captions: bool = Form(True),
    callback_url: Optional[str] = Form(None),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: AsyncSession = Depends(get_db),
) -> JobResponse:
    """Accepts MP3, WAV, or M4A audio upload and creates a B-roll video job."""
    if idempotency_key:
        existing = await IdempotencyManager.get_existing_job(db, idempotency_key)
        if existing:
            return format_job_response(existing, len(existing.scenes) if existing.scenes else 0)

    # Check extension
    filename = file.filename or "audio.mp3"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in {".mp3", ".wav", ".m4a"}:
        raise AppException(
            status_code=400,
            code="UNSUPPORTED_AUDIO_FORMAT",
            message=f"Unsupported audio format '{ext}'. Must be .mp3, .wav, or .m4a.",
        )

    # Parse JSON aspect ratios
    try:
        ratios_list = json.loads(aspect_ratios)
        if not isinstance(ratios_list, list):
            ratios_list = ["16:9"]
    except Exception:
        ratios_list = ["16:9"]

    try:
        avoid_list = json.loads(avoid)
        if not isinstance(avoid_list, list):
            avoid_list = []
    except Exception:
        avoid_list = []

    # Save uploaded file into job storage
    job_id = str(uuid.uuid4())
    storage = get_storage()
    job_dir = storage.get_job_dir(job_id)
    saved_audio_path = os.path.join(job_dir, f"uploaded_{filename}")

    async with aiofiles.open(saved_audio_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    # Validate audio file with FFprobe
    await AudioTranscriptionService.validate_audio_file(saved_audio_path)

    job = Job(
        id=job_id,
        project_name=project_name,
        idempotency_key=idempotency_key,
        status="queued",
        progress=0,
        stage="queued",
        script=script.strip() if script else None,
        audio_path=saved_audio_path,
        aspect_ratios=ratios_list,
        style=style,
        avoid=avoid_list,
        captions_config={"burn_in": burn_in_captions, "srt": True},
        callback_url=callback_url,
    )

    db.add(job)
    await db.commit()
    await db.refresh(job)

    await JobQueue.enqueue(job.id)
    return format_job_response(job, 0)


@router.get("/jobs", response_model=List[JobResponse], summary="List all jobs")
async def list_jobs(
    limit: int = 50,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> List[JobResponse]:
    """Lists recent jobs with status, duration, and metadata for Studio Dashboard."""
    stmt = select(Job).order_by(desc(Job.created_at)).limit(limit)
    if status_filter:
        stmt = stmt.where(Job.status == status_filter)
    res = await db.execute(stmt)
    jobs = res.scalars().all()
    return [format_job_response(j, len(j.scenes) if j.scenes else 0) for j in jobs]


@router.get("/jobs/{job_id}", response_model=JobResponse, summary="Get Job Status and Details")
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
) -> JobResponse:
    """Returns the current state, progress, and stage of a job."""
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise AppException(status_code=404, code="JOB_NOT_FOUND", message=f"Job '{job_id}' not found.")

    stmt_sc = select(Scene).where(Scene.job_id == job_id)
    res_sc = await db.execute(stmt_sc)
    scenes = res_sc.scalars().all()

    return format_job_response(job, len(scenes))


@router.get("/jobs/{job_id}/result", summary="Get Completed Job Result Links")
async def get_job_result(
    job_id: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Returns downloadable URLs and summary metrics for completed jobs."""
    stmt = select(Job).where(Job.id == job_id)
    res = await db.execute(stmt)
    job = res.scalars().first()
    if not job:
        raise AppException(status_code=404, code="JOB_NOT_FOUND", message=f"Job '{job_id}' not found.")

    if job.status == "failed":
        return {
            "job_id": job.id,
            "status": "failed",
            "error": {
                "code": job.error_code,
                "message": job.error_message,
                "details": job.error_details,
            },
        }

    if job.status != "succeeded":
        return {
            "job_id": job.id,
            "status": job.status,
            "progress": job.progress,
            "stage": job.stage,
            "message": "Job is still processing. Please poll /api/v1/jobs/{job_id}.",
        }

    return {
        "job_id": job.id,
        "status": "succeeded",
        "progress": 100,
        "project_name": job.project_name,
        "aspect_ratios": job.aspect_ratios,
        "outputs": job.output_files,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "cost_estimate": job.cost_estimate,
        "warnings": job.warnings or [],
    }


@router.get("/jobs/{job_id}/timeline", summary="Get Scene Timeline JSON")
async def get_job_timeline(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    storage = get_storage()
    path = storage.get_file_path(job_id, "timeline.json")
    if not os.path.exists(path):
        raise AppException(status_code=404, code="TIMELINE_NOT_FOUND", message="Timeline JSON not yet generated.")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@router.get("/jobs/{job_id}/manifest", summary="Get Job Manifest JSON")
async def get_job_manifest(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    storage = get_storage()
    path = storage.get_file_path(job_id, "manifest.json")
    if not os.path.exists(path):
        raise AppException(status_code=404, code="MANIFEST_NOT_FOUND", message="Manifest JSON not yet generated.")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@router.get("/jobs/{job_id}/captions", summary="Download Captions (.srt)")
async def get_job_captions(
    job_id: str,
    db: AsyncSession = Depends(get_db),
):
    storage = get_storage()
    path = storage.get_file_path(job_id, "captions.srt")
    if not os.path.exists(path):
        raise AppException(status_code=404, code="CAPTIONS_NOT_FOUND", message="Captions file not found.")
    return FileResponse(
        path,
        media_type="text/plain; charset=utf-8",
        filename="captions.srt",
    )


@router.get("/jobs/{job_id}/downloads/{filename}", summary="Stream or Download Media Asset")
async def download_asset(
    job_id: str,
    filename: str,
):
    storage = get_storage()
    path = storage.get_file_path(job_id, filename)
    if not os.path.exists(path):
        raise AppException(status_code=404, code="FILE_NOT_FOUND", message=f"Asset '{filename}' not found.")

    media_type = "video/mp4" if filename.endswith(".mp4") else (
        "application/json" if filename.endswith(".json") else (
            "text/plain" if filename.endswith(".srt") else "application/octet-stream"
        )
    )
    return FileResponse(path, media_type=media_type, filename=filename)


@router.get("/jobs/{job_id}/thumbnails/{filename}", summary="Get Scene Thumbnail")
async def get_thumbnail(
    job_id: str,
    filename: str,
):
    storage = get_storage()
    job_dir = storage.get_job_dir(job_id)
    path = os.path.join(job_dir, "thumbnails", filename)
    if not os.path.exists(path):
        # Fallback to direct path
        path = storage.get_file_path(job_id, filename)
    if not os.path.exists(path):
        raise AppException(status_code=404, code="THUMBNAIL_NOT_FOUND", message="Thumbnail not found.")
    return FileResponse(path, media_type="image/jpeg")
