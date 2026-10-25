import os
import pytest
from httpx import AsyncClient
from app.core.storage import get_storage
from app.core.worker import JobWorker
from app.database import AsyncSessionLocal
from app.models.job import Job
from app.services.video_renderer import VideoRenderer


@pytest.mark.asyncio
async def test_end_to_end_video_generation_workflow(client: AsyncClient):
    """
    Complete end-to-end test of the IncuBrix video generation engine:
    1. Submit job via API.
    2. Process job with JobWorker (audio, scenes, footage, captions, rendering, manifest).
    3. Verify output files exist and are valid via FFprobe.
    4. Verify timeline.json and manifest.json schemas.
    5. Test scene replacement.
    """
    payload = {
        "script": "Creative innovation empowers modern builders. High quality video pipelines streamline storytelling.",
        "voice": "en-US-AriaNeural",
        "aspect_ratios": ["16:9"],
        "style": "clean modern technical",
        "project_name": "E2E Test Video",
    }

    # 1. Submit job
    res = await client.post("/api/v1/broll/jobs", json=payload)
    assert res.status_code == 202
    job_id = res.json()["job_id"]

    # 2. Process job directly via worker
    await JobWorker.process_job(job_id)

    # 3. Check job status via API
    res_status = await client.get(f"/api/v1/jobs/{job_id}")
    assert res_status.status_code == 200
    job_data = res_status.json()
    assert job_data["status"] == "succeeded"
    assert job_data["progress"] == 100
    assert job_data["stage"] == "completed"

    storage = get_storage()
    job_dir = storage.get_job_dir(job_id)

    # 4. Verify outputs exist on disk
    video_path = os.path.join(job_dir, "video_16x9.mp4")
    srt_path = os.path.join(job_dir, "captions.srt")
    timeline_path = os.path.join(job_dir, "timeline.json")
    manifest_path = os.path.join(job_dir, "manifest.json")

    assert os.path.exists(video_path), "video_16x9.mp4 must exist"
    assert os.path.exists(srt_path), "captions.srt must exist"
    assert os.path.exists(timeline_path), "timeline.json must exist"
    assert os.path.exists(manifest_path), "manifest.json must exist"

    # Inspect video with FFprobe
    probe_meta = await VideoRenderer.probe_video(video_path)
    assert probe_meta["width"] == 1920
    assert probe_meta["height"] == 1080
    assert probe_meta["duration_seconds"] > 0
    assert probe_meta["codec_video"] == "h264"

    # 5. Verify timeline and manifest endpoints
    res_tl = await client.get(f"/api/v1/jobs/{job_id}/timeline")
    assert res_tl.status_code == 200
    tl_data = res_tl.json()
    assert tl_data["job_id"] == job_id
    assert len(tl_data["scenes"]) >= 2

    res_mf = await client.get(f"/api/v1/jobs/{job_id}/manifest")
    assert res_mf.status_code == 200
    mf_data = res_mf.json()
    assert mf_data["job_id"] == job_id
    assert "rights_and_licensing_summary" in mf_data

    # 6. Test Scene Replacement
    scenes_res = await client.get(f"/api/v1/jobs/{job_id}/scenes")
    assert scenes_res.status_code == 200
    scenes = scenes_res.json()
    assert len(scenes) >= 1
    scene_to_replace = scenes[0]

    replace_payload = {
        "visual_hint": "ultra futuristic neon data center servers",
        "rerender": True,
    }
    rep_res = await client.post(
        f"/api/v1/jobs/{job_id}/scenes/{scene_to_replace['id']}/replace",
        json=replace_payload,
    )
    assert rep_res.status_code == 200
    updated_scene = rep_res.json()
    assert "ultra futuristic" in updated_scene["visual_hint"]
