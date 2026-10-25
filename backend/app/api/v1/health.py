import os
import shutil
from typing import Any, Dict
from fastapi import APIRouter, Response, status
from sqlalchemy import text
from app.config import get_settings
from app.database import AsyncSessionLocal

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> Dict[str, str]:
    """Liveness probe indicating application process is running."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/ready")
async def readiness_check(response: Response) -> Dict[str, Any]:
    """
    Readiness probe validating database connectivity and FFmpeg availability.
    Returns HTTP 200 if ready to accept traffic, 503 if a critical dependency is unavailable.
    """
    checks: Dict[str, any] = {}
    is_ready = True

    # 1. Database check
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = {"status": "ok"}
    except Exception as e:
        is_ready = False
        checks["database"] = {"status": "error", "message": str(e)}

    # 2. FFmpeg check
    ffmpeg_exe = settings.get_ffmpeg_executable()
    has_ffmpeg = bool(shutil.which(ffmpeg_exe) or (ffmpeg_exe and shutil.which(ffmpeg_exe)))
    if has_ffmpeg:
        checks["ffmpeg"] = {"status": "ok", "binary": ffmpeg_exe}
    else:
        # Check if file exists directly
        import os
        if os.path.exists(ffmpeg_exe):
            checks["ffmpeg"] = {"status": "ok", "binary": ffmpeg_exe}
        else:
            is_ready = False
            checks["ffmpeg"] = {"status": "missing", "binary": ffmpeg_exe}

    # 3. Footage providers status
    checks["providers"] = {
        "pexels": "configured" if settings.PEXELS_API_KEY else "unconfigured (optional)",
        "pixabay": "configured" if settings.PIXABAY_API_KEY else "unconfigured (optional)",
        "local_fallback": "active (deterministic)",
        "tts": "EdgeTTS (Neural) + deterministic fallback",
    }

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_ready else "not_ready",
        "checks": checks,
    }
