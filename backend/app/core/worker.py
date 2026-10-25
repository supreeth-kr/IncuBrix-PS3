import asyncio
from datetime import datetime, timezone
import os
import traceback
from typing import Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.core.logging import get_logger, job_id_ctx
from app.core.queue import JobQueue
from app.core.storage import get_storage
from app.database import AsyncSessionLocal
from app.models.job import Job
from app.models.scene import Scene
from app.schemas.error import AppException
from app.schemas.job import SceneInput
from app.services.audio_transcription import AudioTranscriptionService
from app.services.callback_dispatcher import CallbackDispatcher
from app.services.caption_generator import CaptionGenerator
from app.services.footage_selector import FootageSelector
from app.services.manifest_builder import ManifestBuilder
from app.services.scene_planner import ScenePlanner
from app.services.text_to_speech import TextToSpeechService
from app.services.video_renderer import ASPECT_RATIO_CONFIGS, VideoRenderer

logger = get_logger("job_worker")
settings = get_settings()


class JobWorker:
    _worker_task: Optional[asyncio.Task] = None
    _running: bool = False

    @classmethod
    def start(cls) -> None:
        if cls._worker_task is None or cls._worker_task.done():
            cls._running = True
            cls._worker_task = asyncio.create_task(cls._run_worker_loop())
            logger.info("Background job worker loop started.")

    @classmethod
    def stop(cls) -> None:
        cls._running = False
        if cls._worker_task and not cls._worker_task.done():
            cls._worker_task.cancel()
            logger.info("Background job worker loop stopped.")

    @classmethod
    async def _run_worker_loop(cls) -> None:
        while cls._running:
            try:
                # Also check DB for any orphaned queued jobs
                job_id = await JobQueue.get_next()
                token = job_id_ctx.set(job_id)
                try:
                    await cls.process_job(job_id)
                except Exception as e:
                    logger.error(f"Unhandled error processing job {job_id}: {e}", exc_info=True)
                finally:
                    job_id_ctx.reset(token)
                    JobQueue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in worker queue loop: {e}")
                await asyncio.sleep(1.0)

    @classmethod
    async def process_job(cls, job_id: str) -> None:
        storage = get_storage()
        job_dir = storage.get_job_dir(job_id)
        start_time = datetime.now(timezone.utc)

        async with AsyncSessionLocal() as session:
            stmt = select(Job).where(Job.id == job_id)
            res = await session.execute(stmt)
            job: Optional[Job] = res.scalars().first()
            if not job:
                logger.error(f"Job {job_id} not found in database.")
                return

            try:
                # 1. Update state: running, preparing audio
                job.status = "running"
                job.progress = 10
                job.stage = "preparing_audio"
                await session.commit()

                # Audio preparation
                audio_path = os.path.join(job_dir, "master_audio.mp3")
                script_text = job.script or ""
                total_duration = 0.0

                if job.audio_path and os.path.exists(job.audio_path):
                    # Local uploaded audio
                    meta = await AudioTranscriptionService.validate_audio_file(job.audio_path)
                    total_duration = meta["duration"]
                    # Copy to master_audio.mp3
                    shutil_path = audio_path
                    if os.path.abspath(job.audio_path) != os.path.abspath(shutil_path):
                        import shutil
                        shutil.copy2(job.audio_path, shutil_path)
                    if not script_text:
                        script_text, _ = await AudioTranscriptionService.transcribe(job.audio_path)
                        job.script = script_text
                elif job.audio_url:
                    # Remote audio URL - download and validate
                    import httpx
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        resp = await client.get(job.audio_url)
                        resp.raise_for_status()
                        with open(audio_path, "wb") as f:
                            f.write(resp.content)
                    meta = await AudioTranscriptionService.validate_audio_file(audio_path)
                    total_duration = meta["duration"]
                    if not script_text:
                        script_text, _ = await AudioTranscriptionService.transcribe(audio_path)
                        job.script = script_text
                else:
                    # Generate speech from script using EdgeTTS / Fallback
                    _, total_duration = await TextToSpeechService.synthesize(
                        text=script_text,
                        voice=job.voice,
                        output_path=audio_path,
                    )

                job.audio_path = audio_path
                job.progress = 25
                job.stage = "segmenting_scenes"
                await session.commit()

                # 2. Scene Planning
                predefined_inputs = None
                # Check if scenes were submitted in raw form
                # Plan scenes
                planned_scenes = ScenePlanner.plan_scenes(
                    script=script_text,
                    total_audio_duration=total_duration,
                    predefined_scenes=predefined_inputs,
                )

                # 3. Footage Selection
                job.progress = 40
                job.stage = "sourcing_footage"
                await session.commit()

                selector = FootageSelector()
                primary_aspect = job.aspect_ratios[0] if job.aspect_ratios else "16:9"
                scenes_data = [
                    {
                        "scene_index": ps.scene_index,
                        "narration_text": ps.narration_text,
                        "start_time": ps.start_time,
                        "end_time": ps.end_time,
                        "duration": ps.duration,
                        "visual_hint": ps.visual_hint,
                    }
                    for ps in planned_scenes
                ]

                selected_scenes = await selector.select_for_scenes(
                    scenes=scenes_data,
                    aspect_ratio=primary_aspect,
                    style=job.style,
                    avoid=job.avoid or [],
                    work_dir=job_dir,
                    visual_source=job.visual_source or "ai_images",
                )

                # Persist scenes in DB
                for sc in selected_scenes:
                    scene_model = Scene(
                        job_id=job.id,
                        scene_index=sc["scene_index"],
                        narration_text=sc["narration_text"],
                        start_time=sc["start_time"],
                        end_time=sc["end_time"],
                        duration=sc["duration"],
                        clip_identifier=sc["clip_identifier"],
                        source_provider=sc["source_provider"],
                        source_url=sc["source_url"],
                        source_asset_path=sc["source_asset_path"],
                        thumbnail_url=f"/api/v1/jobs/{job.id}/thumbnails/{os.path.basename(sc['thumbnail_path'])}",
                        license_name=sc["license_name"],
                        license_url=sc["license_url"],
                        attribution=sc["attribution"],
                        commercial_use_status=sc["commercial_use_status"],
                        rights_verified=sc["rights_verified"],
                        ai_generated=sc["ai_generated"],
                        selection_reason=sc["selection_reason"],
                        relevance_score=sc["relevance_score"],
                        scoring_method=sc["scoring_method"],
                        visual_hint=sc["visual_hint"],
                        warnings=sc.get("warnings", []),
                    )
                    session.add(scene_model)
                await session.commit()

                # 4. Generate Captions (.srt)
                job.progress = 60
                job.stage = "generating_captions"
                await session.commit()

                srt_path = os.path.join(job_dir, "captions.srt")
                CaptionGenerator.generate_srt(selected_scenes, srt_path)
                CaptionGenerator.validate_srt_file(srt_path)

                # 5. Render Video Outputs for each requested aspect ratio
                job.progress = 75
                job.stage = "rendering_video"
                await session.commit()

                rendered_outputs: Dict[str, any] = {}
                burn_in = bool(job.captions_config.get("burn_in", True))

                for ratio in job.aspect_ratios:
                    cfg = ASPECT_RATIO_CONFIGS.get(ratio, ASPECT_RATIO_CONFIGS["16:9"])
                    out_filename = cfg["filename"]
                    out_path = os.path.join(job_dir, out_filename)

                    meta = await VideoRenderer.render_aspect_ratio(
                        aspect_ratio=ratio,
                        scenes=selected_scenes,
                        audio_path=audio_path,
                        srt_path=srt_path,
                        burn_in_captions=burn_in,
                        output_path=out_path,
                        work_dir=job_dir,
                    )
                    meta["aspect_ratio"] = ratio
                    rendered_outputs[f"video_{ratio.replace(':', 'x')}"] = meta

                # Add captions file to output manifest
                rendered_outputs["captions"] = {
                    "filename": "captions.srt",
                    "file_path": srt_path,
                    "file_size_bytes": os.path.getsize(srt_path),
                }

                # 6. Build timeline.json and manifest.json
                job.progress = 90
                job.stage = "building_manifest"
                await session.commit()

                timeline_path = os.path.join(job_dir, "timeline.json")
                ManifestBuilder.build_timeline_json(
                    job_id=job.id,
                    scenes=selected_scenes,
                    output_path=timeline_path,
                )
                rendered_outputs["timeline"] = {
                    "filename": "timeline.json",
                    "file_path": timeline_path,
                    "file_size_bytes": os.path.getsize(timeline_path),
                }

                end_time = datetime.now(timezone.utc)
                manifest_path = os.path.join(job_dir, "manifest.json")
                ManifestBuilder.build_manifest_json(
                    job_id=job.id,
                    project_name=job.project_name,
                    settings_dict={
                        "voice": job.voice,
                        "style": job.style,
                        "avoid": job.avoid,
                        "captions": job.captions_config,
                    },
                    aspect_ratios=job.aspect_ratios,
                    start_time=start_time,
                    end_time=end_time,
                    scenes=selected_scenes,
                    rendered_outputs=rendered_outputs,
                    output_path=manifest_path,
                    warnings=job.warnings or [],
                )
                rendered_outputs["manifest"] = {
                    "filename": "manifest.json",
                    "file_path": manifest_path,
                    "file_size_bytes": os.path.getsize(manifest_path),
                }

                # 7. Complete Job
                job.output_files = {
                    k: f"/api/v1/jobs/{job.id}/downloads/{v['filename']}"
                    for k, v in rendered_outputs.items()
                }
                job.status = "succeeded"
                job.progress = 100
                job.stage = "completed"
                job.completed_at = end_time
                await session.commit()

                # Dispatch callback webhook if requested
                if job.callback_url:
                    await CallbackDispatcher.dispatch(
                        job.callback_url,
                        {
                            "job_id": job.id,
                            "status": "succeeded",
                            "completed_at": end_time.isoformat(),
                            "output_files": job.output_files,
                        },
                    )

            except AppException as ae:
                logger.error(f"Application error during job {job_id}: {ae.code} - {ae.message}")
                job.status = "failed"
                job.stage = "failed"
                job.error_code = ae.code
                job.error_message = ae.message
                job.error_details = ae.details
                job.completed_at = datetime.now(timezone.utc)
                await session.commit()
                if job.callback_url:
                    await CallbackDispatcher.dispatch(
                        job.callback_url,
                        {"job_id": job.id, "status": "failed", "error": ae.message},
                    )
            except Exception as e:
                logger.error(f"Unexpected error in job {job_id}: {e}\n{traceback.format_exc()}")
                job.status = "failed"
                job.stage = "failed"
                job.error_code = "INTERNAL_PROCESSING_ERROR"
                job.error_message = str(e)
                job.completed_at = datetime.now(timezone.utc)
                await session.commit()
                if job.callback_url:
                    await CallbackDispatcher.dispatch(
                        job.callback_url,
                        {"job_id": job.id, "status": "failed", "error": str(e)},
                    )

    @classmethod
    async def replace_scene_and_rerender(
        cls,
        job_id: str,
        scene_id: str,
        query: Optional[str] = None,
        visual_hint: Optional[str] = None,
        provider_name: Optional[str] = None,
        custom_media_url: Optional[str] = None,
        rerender: bool = True,
    ) -> Scene:
        """
        Replaces a scene's visual footage and optionally rerenders output video files.
        Preserves other scenes and applies partial rerendering.
        """
        storage = get_storage()
        job_dir = storage.get_job_dir(job_id)

        async with AsyncSessionLocal() as session:
            stmt = select(Job).where(Job.id == job_id)
            res = await session.execute(stmt)
            job = res.scalars().first()
            if not job:
                raise AppException(status_code=404, code="JOB_NOT_FOUND", message=f"Job {job_id} not found.")

            stmt_sc = select(Scene).where(Scene.id == scene_id, Scene.job_id == job_id)
            res_sc = await session.execute(stmt_sc)
            scene = res_sc.scalars().first()
            if not scene:
                raise AppException(status_code=404, code="SCENE_NOT_FOUND", message=f"Scene {scene_id} not found.")

            # Search new asset
            selector = FootageSelector()
            search_query = visual_hint or query or scene.narration_text
            aspect = job.aspect_ratios[0] if job.aspect_ratios else "16:9"

            new_selected = await selector.select_for_scenes(
                scenes=[{
                    "scene_index": scene.scene_index,
                    "narration_text": scene.narration_text,
                    "start_time": scene.start_time,
                    "end_time": scene.end_time,
                    "duration": scene.duration,
                    "visual_hint": search_query,
                    "provider": provider_name,
                }],
                aspect_ratio=aspect,
                style=job.style,
                avoid=job.avoid or [],
                work_dir=job_dir,
                visual_source="ai_images" if provider_name == "ai_image_generator" else (job.visual_source or "ai_images"),
                preferred_provider=provider_name,
            )
            sc_info = new_selected[0]

            # Update scene record
            scene.clip_identifier = sc_info["clip_identifier"]
            scene.source_provider = sc_info["source_provider"]
            scene.source_url = sc_info["source_url"]
            scene.source_asset_path = sc_info["source_asset_path"]
            scene.thumbnail_url = f"/api/v1/jobs/{job.id}/thumbnails/{os.path.basename(sc_info['thumbnail_path'])}"
            scene.license_name = sc_info["license_name"]
            scene.license_url = sc_info["license_url"]
            scene.attribution = sc_info["attribution"]
            scene.commercial_use_status = sc_info["commercial_use_status"]
            scene.rights_verified = sc_info["rights_verified"]
            scene.ai_generated = sc_info.get("ai_generated", False)
            scene.selection_reason = f"Replaced by user request: {sc_info['selection_reason']}"
            scene.relevance_score = sc_info["relevance_score"]
            scene.visual_hint = search_query
            await session.commit()

            # If rerender requested, perform partial rerender
            if rerender:
                # Fetch all scenes ordered
                stmt_all = select(Scene).where(Scene.job_id == job_id).order_by(Scene.scene_index)
                res_all = await session.execute(stmt_all)
                all_scenes = res_all.scalars().all()
                scenes_payload = [
                    {
                        "id": s.id,
                        "scene_index": s.scene_index,
                        "narration_text": s.narration_text,
                        "start_time": s.start_time,
                        "end_time": s.end_time,
                        "duration": s.duration,
                        "source_asset_path": s.source_asset_path,
                        "clip_identifier": s.clip_identifier,
                        "source_provider": s.source_provider,
                        "source_url": s.source_url,
                        "license_name": s.license_name,
                        "license_url": s.license_url,
                        "attribution": s.attribution,
                        "commercial_use_status": s.commercial_use_status,
                        "rights_verified": s.rights_verified,
                        "ai_generated": s.ai_generated,
                        "selection_reason": s.selection_reason,
                        "relevance_score": s.relevance_score,
                    }
                    for s in all_scenes
                ]

                audio_path = job.audio_path or os.path.join(job_dir, "master_audio.mp3")
                srt_path = os.path.join(job_dir, "captions.srt")
                burn_in = bool(job.captions_config.get("burn_in", True))

                rendered_outputs: Dict[str, any] = {}
                for ratio in job.aspect_ratios:
                    cfg = ASPECT_RATIO_CONFIGS.get(ratio, ASPECT_RATIO_CONFIGS["16:9"])
                    out_path = os.path.join(job_dir, cfg["filename"])
                    meta = await VideoRenderer.render_aspect_ratio(
                        aspect_ratio=ratio,
                        scenes=scenes_payload,
                        audio_path=audio_path,
                        srt_path=srt_path,
                        burn_in_captions=burn_in,
                        output_path=out_path,
                        work_dir=job_dir,
                    )
                    meta["aspect_ratio"] = ratio
                    rendered_outputs[f"video_{ratio.replace(':', 'x')}"] = meta

                # Update timeline and manifest
                timeline_path = os.path.join(job_dir, "timeline.json")
                ManifestBuilder.build_timeline_json(job.id, scenes_payload, timeline_path)

                manifest_path = os.path.join(job_dir, "manifest.json")
                ManifestBuilder.build_manifest_json(
                    job_id=job.id,
                    project_name=job.project_name,
                    settings_dict={"voice": job.voice, "style": job.style},
                    aspect_ratios=job.aspect_ratios,
                    start_time=job.created_at,
                    end_time=datetime.now(timezone.utc),
                    scenes=scenes_payload,
                    rendered_outputs=rendered_outputs,
                    output_path=manifest_path,
                )

            return scene
