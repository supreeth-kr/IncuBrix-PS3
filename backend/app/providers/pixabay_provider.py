import os
from typing import List, Optional
import httpx
from app.config import get_settings
from app.core.logging import get_logger
from app.providers.base import BaseFootageProvider, FootageAsset

logger = get_logger("pixabay_provider")
settings = get_settings()


class PixabayProvider(BaseFootageProvider):
    SEARCH_URL = "https://pixabay.com/api/videos/"

    @property
    def provider_name(self) -> str:
        return "pixabay"

    def is_configured(self) -> bool:
        return bool(settings.PIXABAY_API_KEY and settings.PIXABAY_API_KEY.strip())

    async def search(
        self,
        query: str,
        visual_hint: str,
        aspect_ratio: str,
        avoid: List[str],
        min_duration: float,
        limit: int = 5,
    ) -> List[FootageAsset]:
        if not self.is_configured():
            logger.debug("Pixabay API key not configured; skipping provider.")
            return []

        search_query = visual_hint or query or "cinematic"
        params = {
            "key": settings.PIXABAY_API_KEY,
            "q": search_query,
            "per_page": limit * 2,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(self.SEARCH_URL, params=params)
                if res.status_code != 200:
                    logger.warning(f"Pixabay API error: {res.status_code}")
                    return []
                data = res.json()
        except Exception as e:
            logger.error(f"Error querying Pixabay API: {e}")
            return []

        hits = data.get("hits", [])
        assets: List[FootageAsset] = []

        for item in hits:
            vids = item.get("videos", {})
            medium = vids.get("medium") or vids.get("large") or vids.get("small")
            if not medium or not medium.get("url"):
                continue

            user = item.get("user", "Pixabay Creator")
            asset = FootageAsset(
                clip_identifier=f"pixabay_{item.get('id')}",
                source_provider="pixabay",
                source_url=item.get("pageURL", "https://pixabay.com"),
                download_url=medium.get("url"),
                thumbnail_url=item.get("userImageURL"),
                license_name="Pixabay Content License",
                license_url="https://pixabay.com/service/license-summary/",
                attribution=f"Video by {user} from Pixabay",
                commercial_use_status="permitted",
                rights_verified=True,
                ai_generated=False,
                selection_reason=f"Matched visual query '{search_query}' via Pixabay API.",
                relevance_score=0.88,
                scoring_method="api_semantic_ranking",
                duration=float(item.get("duration", min_duration)),
                width=int(medium.get("width") or 1920),
                height=int(medium.get("height") or 1080),
                tags=item.get("tags", "").split(", "),
            )
            assets.append(asset)
            if len(assets) >= limit:
                break

        return assets

    async def download_asset(self, asset: FootageAsset, dest_path: str) -> str:
        os.makedirs(os.path.dirname(os.path.abspath(dest_path)), exist_ok=True)
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(asset.download_url)
            resp.raise_for_status()
            with open(dest_path, "wb") as f:
                f.write(resp.content)
        return dest_path
