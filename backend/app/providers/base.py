from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field


class FootageAsset(BaseModel):
    clip_identifier: str
    source_provider: str  # "pexels", "pixabay", "local_fallback"
    source_url: str
    download_url: str
    thumbnail_url: Optional[str] = None
    license_name: str
    license_url: Optional[str] = None
    attribution: str
    commercial_use_status: str
    rights_verified: bool
    ai_generated: bool
    selection_reason: str
    relevance_score: float
    scoring_method: str
    duration: float
    width: int
    height: int
    tags: List[str] = Field(default_factory=list)


class BaseFootageProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    async def search(
        self,
        query: str,
        visual_hint: str,
        aspect_ratio: str,
        avoid: List[str],
        min_duration: float,
        limit: int = 5,
    ) -> List[FootageAsset]:
        """Searches for suitable footage matching prompt constraints."""
        pass

    @abstractmethod
    async def download_asset(self, asset: FootageAsset, dest_path: str) -> str:
        """Downloads or generates the asset file at dest_path."""
        pass
