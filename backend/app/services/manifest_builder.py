import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.config import get_settings
from app.schemas.manifest import ManifestDocument, OutputFileMetadata
from app.schemas.timeline import TimelineDocument, TimelineSceneItem

settings = get_settings()


class ManifestBuilder:
    @staticmethod
    def build_timeline_json(
        job_id: str,
        scenes: List[Dict[str, any]],
        output_path: str,
    ) -> str:
        """Constructs and validates timeline.json."""
        items: List[TimelineSceneItem] = []
        total_dur = 0.0

        for sc in scenes:
            item = TimelineSceneItem(
                scene_id=str(sc.get("id") or f"scene_{sc.get('scene_index', 0)}"),
                scene_index=int(sc.get("scene_index", 0)),
                narration_text=sc.get("narration_text", ""),
                start_time=float(sc.get("start_time", 0.0)),
                end_time=float(sc.get("end_time", 0.0)),
                duration=float(sc.get("duration", 0.0)),
                clip_identifier=sc.get("clip_identifier", ""),
                source_provider=sc.get("source_provider", "local_fallback"),
                source_url=sc.get("source_url"),
                licence_name=sc.get("license_name", "IncuBrix Visual License"),
                licence_url=sc.get("license_url"),
                attribution=sc.get("attribution", ""),
                commercial_use_status=sc.get("commercial_use_status", "unverified"),
                rights_verified=bool(sc.get("rights_verified", False)),
                ai_generated=bool(sc.get("ai_generated", False)),
                selection_reason=sc.get("selection_reason", ""),
                relevance_score=sc.get("relevance_score"),
                warnings=sc.get("warnings", []),
            )
            items.append(item)
            total_dur = max(total_dur, item.end_time)

        doc = TimelineDocument(
            job_id=job_id,
            total_scenes=len(items),
            total_duration_seconds=round(total_dur, 2),
            scenes=items,
        )

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(doc.model_dump_json(indent=2))

        return output_path

    @staticmethod
    def build_manifest_json(
        job_id: str,
        project_name: str,
        settings_dict: Dict[str, Any],
        aspect_ratios: List[str],
        start_time: datetime,
        end_time: datetime,
        scenes: List[Dict[str, any]],
        rendered_outputs: Dict[str, Dict[str, any]],
        output_path: str,
        warnings: Optional[List[str]] = None,
    ) -> str:
        """Constructs and validates manifest.json."""
        # Normalize datetimes for difference calculation
        t_start = start_time.replace(tzinfo=None) if start_time.tzinfo else start_time
        t_end = end_time.replace(tzinfo=None) if end_time.tzinfo else end_time
        dur_seconds = max(0.1, round((t_end - t_start).total_seconds(), 2))

        # Count provider and fallback statistics
        provider_counts: Dict[str, int] = {}
        unverified_count = 0
        ai_generated_count = 0
        commercial_approved = 0

        for sc in scenes:
            prov = sc.get("source_provider", "local_fallback")
            provider_counts[prov] = provider_counts.get(prov, 0) + 1
            if not sc.get("rights_verified"):
                unverified_count += 1
            if sc.get("ai_generated"):
                ai_generated_count += 1
            if sc.get("commercial_use_status") == "permitted":
                commercial_approved += 1

        # Format output file metadata
        out_files_meta: Dict[str, OutputFileMetadata] = {}
        for key, info in rendered_outputs.items():
            out_files_meta[key] = OutputFileMetadata(
                filename=info.get("filename", os.path.basename(info.get("file_path", ""))),
                file_path=info.get("file_path", ""),
                aspect_ratio=info.get("aspect_ratio"),
                file_size_bytes=info.get("file_size_bytes", 0),
                duration_seconds=info.get("duration_seconds"),
                width=info.get("width"),
                height=info.get("height"),
                codec_video=info.get("codec_video"),
                codec_audio=info.get("codec_audio"),
                fps=info.get("fps"),
                download_url=f"/api/v1/jobs/{job_id}/downloads/{info.get('filename')}",
            )

        doc = ManifestDocument(
            application_version=settings.APP_VERSION,
            job_id=job_id,
            project_name=project_name,
            providers={
                "tts": "EdgeTTS (Microsoft Neural Voices) + Local Synth Fallback",
                "footage": "Pexels API, Pixabay API, IncuBrix Procedural Fallback Engine",
                "renderer": "FFmpeg 9.0 (H.264 / AAC / 30fps)",
                "transcription": "FFprobe Inspector / Fallback Aligner",
            },
            models={
                "voice_model": settings_dict.get("voice", settings.DEFAULT_VOICE),
                "encoding": "libx264 (crf 20-22, yuv420p)",
            },
            settings=settings_dict,
            output_aspect_ratios=aspect_ratios,
            processing_start_time=start_time.isoformat(),
            processing_end_time=end_time.isoformat(),
            measured_duration_seconds=dur_seconds,
            cost_estimate={
                "estimated_usd": 0.0,
                "currency": "USD",
                "basis": "Free Tier / Deterministic Local Pipeline (Zero API charges incurred)",
            },
            warnings=warnings or [],
            fallback_usage={
                "fallback_clips_used": provider_counts.get("local_fallback", 0),
                "external_clips_used": sum(v for k, v in provider_counts.items() if k != "local_fallback"),
                "fallback_ratio": round(provider_counts.get("local_fallback", 0) / max(1, len(scenes)), 2),
            },
            rights_and_licensing_summary={
                "total_scenes": len(scenes),
                "commercial_use_permitted_scenes": commercial_approved,
                "unverified_scenes": unverified_count,
                "ai_generated_scenes": ai_generated_count,
                "providers_used": list(provider_counts.keys()),
            },
            output_files=out_files_meta,
        )

        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(doc.model_dump_json(indent=2))

        return output_path
