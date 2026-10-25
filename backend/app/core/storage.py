import os
import shutil
from abc import ABC, abstractmethod
from typing import Optional
from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger("storage")
settings = get_settings()


class StorageAdapter(ABC):
    @abstractmethod
    async def save_file(self, job_id: str, filename: str, content: bytes) -> str:
        """Save raw bytes to storage and return local path or URL."""
        pass

    @abstractmethod
    async def copy_file(self, job_id: str, source_path: str, target_filename: str) -> str:
        """Copy a file from local path into the job's storage area."""
        pass

    @abstractmethod
    def get_job_dir(self, job_id: str) -> str:
        """Get the base directory for the job."""
        pass

    @abstractmethod
    def get_file_path(self, job_id: str, filename: str) -> str:
        """Get full path to an asset."""
        pass

    @abstractmethod
    def file_exists(self, job_id: str, filename: str) -> bool:
        """Check if an asset exists."""
        pass

    @abstractmethod
    def get_public_url(self, job_id: str, filename: str) -> str:
        """Get accessible download/streaming URL for the asset."""
        pass


class LocalStorageAdapter(StorageAdapter):
    def __init__(self, base_dir: str):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def get_job_dir(self, job_id: str) -> str:
        path = os.path.join(self.base_dir, "jobs", job_id)
        os.makedirs(path, exist_ok=True)
        return path

    def get_file_path(self, job_id: str, filename: str) -> str:
        return os.path.join(self.get_job_dir(job_id), filename)

    def file_exists(self, job_id: str, filename: str) -> bool:
        path = self.get_file_path(job_id, filename)
        return os.path.exists(path) and os.path.getsize(path) > 0

    async def save_file(self, job_id: str, filename: str, content: bytes) -> str:
        path = self.get_file_path(job_id, filename)
        with open(path, "wb") as f:
            f.write(content)
        return path

    async def copy_file(self, job_id: str, source_path: str, target_filename: str) -> str:
        target = self.get_file_path(job_id, target_filename)
        shutil.copy2(source_path, target)
        return target

    def get_public_url(self, job_id: str, filename: str) -> str:
        return f"/api/v1/jobs/{job_id}/downloads/{filename}"


_storage_instance: Optional[StorageAdapter] = None


def get_storage() -> StorageAdapter:
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalStorageAdapter(settings.LOCAL_STORAGE_DIR)
    return _storage_instance
