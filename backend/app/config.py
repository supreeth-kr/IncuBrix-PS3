from functools import lru_cache
import os
import shutil
from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "IncuBrix Script & Voiceover to B-Roll Engine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/incubrix.db"

    # Storage
    STORAGE_BACKEND: str = "local"  # "local" or "s3"
    LOCAL_STORAGE_DIR: str = "./storage"
    S3_ENDPOINT_URL: Optional[str] = None
    S3_BUCKET_NAME: str = "incubrix-videos"
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_REGION: str = "us-east-1"

    # Media Binaries
    FFMPEG_PATH: str = "ffmpeg"
    FFPROBE_PATH: str = "ffprobe"

    # Footage Provider API Keys
    PEXELS_API_KEY: Optional[str] = None
    PIXABAY_API_KEY: Optional[str] = None

    # TTS & Transcription
    DEFAULT_VOICE: str = "en-US-AriaNeural"
    OPENAI_API_KEY: Optional[str] = None
    ENABLE_DETERMINISTIC_FALLBACK: bool = True

    # Security & Callbacks
    WEBHOOK_SECRET: str = "incubrix-signature-secret-key-2026"
    MAX_AUDIO_DURATION_SECONDS: int = 600  # 10 minutes max
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB

    def get_ffmpeg_executable(self) -> str:
        """Find the working ffmpeg executable from PATH or common install dirs."""
        if self.FFMPEG_PATH and os.path.exists(self.FFMPEG_PATH):
            return self.FFMPEG_PATH
        path_cmd = shutil.which(self.FFMPEG_PATH or "ffmpeg")
        if path_cmd:
            return path_cmd
        user_local = os.environ.get("LOCALAPPDATA", "")
        candidates = [
            os.path.join(user_local, "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
            os.path.join(user_local, "Programs", "ffmpeg", "bin", "ffmpeg.exe"),
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        ]
        # Check WinGet Packages
        winget_pkg = os.path.join(user_local, "Microsoft", "WinGet", "Packages")
        if os.path.exists(winget_pkg):
            for root, _, files in os.walk(winget_pkg):
                if "ffmpeg.exe" in files:
                    candidates.append(os.path.join(root, "ffmpeg.exe"))
        for candidate in candidates:
            if os.path.exists(candidate):
                return candidate
        return "ffmpeg"

    def get_ffprobe_executable(self) -> str:
        """Find the working ffprobe executable from PATH or common install dirs."""
        if self.FFPROBE_PATH and os.path.exists(self.FFPROBE_PATH):
            return self.FFPROBE_PATH
        path_cmd = shutil.which(self.FFPROBE_PATH or "ffprobe")
        if path_cmd:
            return path_cmd
        user_local = os.environ.get("LOCALAPPDATA", "")
        candidates = [
            os.path.join(user_local, "Microsoft", "WinGet", "Links", "ffprobe.exe"),
            os.path.join(user_local, "Programs", "ffmpeg", "bin", "ffprobe.exe"),
            r"C:\Program Files\ffmpeg\bin\ffprobe.exe",
        ]
        winget_pkg = os.path.join(user_local, "Microsoft", "WinGet", "Packages")
        if os.path.exists(winget_pkg):
            for root, _, files in os.walk(winget_pkg):
                if "ffprobe.exe" in files:
                    candidates.append(os.path.join(root, "ffprobe.exe"))
        for candidate in candidates:
            if os.path.exists(candidate):
                return candidate
        return "ffprobe"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
