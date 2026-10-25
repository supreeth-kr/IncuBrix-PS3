import os
from typing import Dict, List, Optional, Set
from app.config import get_settings
from app.core.logging import get_logger
from app.providers.base import BaseFootageProvider, FootageAsset
from app.providers.fallback_provider import FallbackProvider
from app.providers.pexels_provider import PexelsProvider
from app.providers.pixabay_provider import PixabayProvider

logger = get_logger("footage_selector")
settings = get_settings()


class FootageSelector:
    def __init__(self, providers: Optional[List[BaseFootageProvider]] = None):
        if providers is not None:
            self.providers = providers
        else:
            self.providers = [
                PexelsProvider(),
                PixabayProvider(),
                FallbackProvider(),
            ]
        self.fallback = FallbackProvider()

    async def select_for_scenes(
        self,
        scenes: List[Dict[str, any]],
        aspect_ratio: str,
        style: str,
        avoid: List[str],
        work_dir: str,
    ) -> List[Dict[str, any]]:
        """
        Selects and downloads footage for all scenes.
        Prevents duplicate footage across the video.
        Ensures each scene has an asset file downloaded/generated.
        """
        used_clip_ids: Set[str] = set()
        results: List[Dict[str, any]] = []

        for scene in scenes:
            text = scene.get("narration_text", "")
            hint = scene.get("visual_hint", "")
            dur = scene.get("duration", 4.0)
            idx = scene.get("scene_index", 0)

            chosen_asset: Optional[FootageAsset] = None

            # 1. Try configured external providers first
            for provider in self.providers:
                if provider.provider_name == "local_fallback":
                    continue
                if not provider.is_configured():
                    continue

                try:
                    candidates = await provider.search(
                        query=text,
                        visual_hint=hint,
                        aspect_ratio=aspect_ratio,
                        avoid=avoid,
                        min_duration=dur,
                        limit=5,
                    )
                    # Pick first non-duplicate candidate
                    for cand in candidates:
                        if cand.clip_identifier not in used_clip_ids:
                            chosen_asset = cand
                            break
                    if chosen_asset:
                        break
                except Exception as e:
                    logger.warning(f"Provider {provider.provider_name} search failed: {e}")

            # 2. Fall back to local procedural generator if no asset found
            if not chosen_asset:
                fallback_candidates = await self.fallback.search(
                    query=text,
                    visual_hint=hint,
                    aspect_ratio=aspect_ratio,
                    avoid=avoid,
                    min_duration=dur,
                )
                chosen_asset = fallback_candidates[0]

            used_clip_ids.add(chosen_asset.clip_identifier)

            # 3. Download/render the clip to local storage
            clip_filename = f"scene_{idx:02d}_{chosen_asset.clip_identifier}.mp4"
            dest_path = os.path.join(work_dir, "clips", clip_filename)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)

            try:
                # Find the right provider to download
                provider_to_download = next(
                    (p for p in self.providers if p.provider_name == chosen_asset.source_provider),
                    self.fallback,
                )
                await provider_to_download.download_asset(chosen_asset, dest_path)
            except Exception as e:
                logger.error(f"Download failed for {chosen_asset.clip_identifier}: {e}. Using fallback.")
                await self.fallback.download_asset(chosen_asset, dest_path)

            # Generate scene thumbnail
            thumb_filename = f"thumb_{idx:02d}.jpg"
            thumb_path = os.path.join(work_dir, "thumbnails", thumb_filename)
            await self._generate_thumbnail(dest_path, thumb_path)

            results.append({
                "scene_index": idx,
                "narration_text": text,
                "start_time": scene.get("start_time", 0.0),
                "end_time": scene.get("end_time", dur),
                "duration": dur,
                "clip_identifier": chosen_asset.clip_identifier,
                "source_provider": chosen_asset.source_provider,
                "source_url": chosen_asset.source_url,
                "source_asset_path": dest_path,
                "thumbnail_path": thumb_path,
                "thumbnail_url": f"/api/v1/jobs/placeholder/thumbnails/{thumb_filename}",
                "license_name": chosen_asset.license_name,
                "license_url": chosen_asset.license_url,
                "attribution": chosen_asset.attribution,
                "commercial_use_status": chosen_asset.commercial_use_status,
                "rights_verified": chosen_asset.rights_verified,
                "ai_generated": chosen_asset.ai_generated,
                "selection_reason": chosen_asset.selection_reason,
                "relevance_score": chosen_asset.relevance_score,
                "scoring_method": chosen_asset.scoring_method,
                "visual_hint": hint,
                "warnings": [],
            })

        return results

    async def _generate_thumbnail(self, video_path: str, thumb_path: str) -> None:
        """Extracts frame at 1s for thumbnail using FFmpeg."""
        os.makedirs(os.path.dirname(thumb_path), exist_ok=True)
        ffmpeg_bin = settings.get_ffmpeg_executable()
        cmd = [
            ffmpeg_bin,
            "-y",
            "-ss", "00:00:01.000",
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            thumb_path,
        ]
        import asyncio
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
