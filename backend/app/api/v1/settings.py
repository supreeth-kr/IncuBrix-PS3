import os
from typing import Optional
from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from app.config import get_settings
from app.core.logging import get_logger

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])
logger = get_logger("api_settings")
settings = get_settings()


class SettingsUpdatePayload(BaseModel):
    gemini_api_key: Optional[str] = Field(None, description="Google Gemini / Imagen API Key")
    openai_api_key: Optional[str] = Field(None, description="OpenAI API Key")
    pexels_api_key: Optional[str] = Field(None, description="Pexels Stock API Key")
    pixabay_api_key: Optional[str] = Field(None, description="Pixabay Stock API Key")
    ai_image_engine: Optional[str] = Field("auto", description="Preferred AI generation engine ('auto', 'gemini', 'flux', 'dalle')")


class SettingsResponse(BaseModel):
    app_name: str
    app_version: str
    ai_image_engine: str
    gemini_configured: bool
    gemini_masked_key: Optional[str] = None
    openai_configured: bool
    openai_masked_key: Optional[str] = None
    pexels_configured: bool
    pixabay_configured: bool
    ffmpeg_binary: str


def _mask_key(key: Optional[str]) -> Optional[str]:
    if not key or len(key) < 8:
        return None
    return f"{key[:4]}...{key[-4:]}"


@router.get("", response_model=SettingsResponse)
async def get_current_settings():
    gemini_key = settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    openai_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY")

    return SettingsResponse(
        app_name=settings.APP_NAME,
        app_version=settings.APP_VERSION,
        ai_image_engine=settings.AI_IMAGE_ENGINE or "auto",
        gemini_configured=bool(gemini_key),
        gemini_masked_key=_mask_key(gemini_key),
        openai_configured=bool(openai_key),
        openai_masked_key=_mask_key(openai_key),
        pexels_configured=bool(settings.PEXELS_API_KEY),
        pixabay_configured=bool(settings.PIXABAY_API_KEY),
        ffmpeg_binary=settings.get_ffmpeg_executable(),
    )


@router.post("", response_model=SettingsResponse)
async def update_settings(payload: SettingsUpdatePayload):
    """
    Saves and applies configuration credentials dynamically at runtime.
    Also updates .env file if writable.
    """
    if payload.gemini_api_key is not None:
        key_val = payload.gemini_api_key.strip()
        settings.GEMINI_API_KEY = key_val or None
        if key_val:
            os.environ["GEMINI_API_KEY"] = key_val

    if payload.openai_api_key is not None:
        key_val = payload.openai_api_key.strip()
        settings.OPENAI_API_KEY = key_val or None
        if key_val:
            os.environ["OPENAI_API_KEY"] = key_val

    if payload.pexels_api_key is not None:
        settings.PEXELS_API_KEY = payload.pexels_api_key.strip() or None

    if payload.pixabay_api_key is not None:
        settings.PIXABAY_API_KEY = payload.pixabay_api_key.strip() or None

    if payload.ai_image_engine is not None:
        settings.AI_IMAGE_ENGINE = payload.ai_image_engine.strip().lower()

    # Attempt to persist in .env
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    try:
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        
        env_dict = {}
        for l in lines:
            if "=" in l and not l.strip().startswith("#"):
                k, v = l.strip().split("=", 1)
                env_dict[k.strip()] = v.strip()

        if settings.GEMINI_API_KEY:
            env_dict["GEMINI_API_KEY"] = f'"{settings.GEMINI_API_KEY}"'
        if settings.OPENAI_API_KEY:
            env_dict["OPENAI_API_KEY"] = f'"{settings.OPENAI_API_KEY}"'
        if settings.AI_IMAGE_ENGINE:
            env_dict["AI_IMAGE_ENGINE"] = f'"{settings.AI_IMAGE_ENGINE}"'

        with open(env_path, "w", encoding="utf-8") as f:
            for k, v in env_dict.items():
                f.write(f"{k}={v}\n")
    except Exception as e:
        logger.warning(f"Could not persist settings to .env file: {e}")

    logger.info("Application settings and API credentials updated successfully.")
    return await get_current_settings()
