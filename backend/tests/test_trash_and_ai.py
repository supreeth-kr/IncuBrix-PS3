import os
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.providers.ai_image_provider import AIImageProvider


@pytest.mark.asyncio
async def test_soft_delete_and_restore_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a job
        payload = {
            "project_name": "Test Project for Soft Delete",
            "script": "Artificial intelligence creates visuals for video scenes.",
            "voice": "en-US-AriaNeural",
            "aspect_ratios": ["16:9"],
            "visual_source": "ai_images",
        }
        res = await client.post("/api/v1/broll/jobs", json=payload)
        assert res.status_code == 202
        job_data = res.json()
        job_id = job_data["job_id"]
        assert job_data["is_deleted"] is False

        # 2. Verify it shows up in active jobs list
        res_list = await client.get("/api/v1/jobs")
        assert res_list.status_code == 200
        active_ids = [j["job_id"] for j in res_list.json()]
        assert job_id in active_ids

        # 3. Soft-delete the job (move to trash)
        res_del = await client.delete(f"/api/v1/jobs/{job_id}")
        assert res_del.status_code == 200
        del_data = res_del.json()
        assert del_data["days_remaining"] == 30
        assert "trash" in del_data["message"].lower()

        # 4. Active jobs list should NOT contain the deleted job
        res_list_after = await client.get("/api/v1/jobs")
        assert res_list_after.status_code == 200
        active_ids_after = [j["job_id"] for j in res_list_after.json()]
        assert job_id not in active_ids_after

        # 5. Trash endpoint should list the deleted job with 30 days remaining
        res_trash = await client.get("/api/v1/trash")
        assert res_trash.status_code == 200
        trash_items = res_trash.json()
        matching = [t for t in trash_items if t["job_id"] == job_id]
        assert len(matching) == 1
        assert matching[0]["is_deleted"] is True
        assert matching[0]["days_remaining"] == 30

        # 6. Restore the job from trash
        res_restore = await client.post(f"/api/v1/jobs/{job_id}/restore")
        assert res_restore.status_code == 200
        restored_job = res_restore.json()
        assert restored_job["is_deleted"] is False
        assert restored_job["deleted_at"] is None

        # 7. Job is now back in active list
        res_list_restored = await client.get("/api/v1/jobs")
        restored_ids = [j["job_id"] for j in res_list_restored.json()]
        assert job_id in restored_ids


@pytest.mark.asyncio
async def test_permanent_delete_and_empty_trash():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a job to delete permanently
        payload = {
            "project_name": "Project to Purge Permanently",
            "script": "Testing trash purge and cleanup.",
            "voice": "en-US-AriaNeural",
            "aspect_ratios": ["16:9"],
        }
        res = await client.post("/api/v1/broll/jobs", json=payload)
        job_id = res.json()["job_id"]

        # Move to trash
        await client.delete(f"/api/v1/jobs/{job_id}")

        # Empty trash
        res_empty = await client.post("/api/v1/trash/empty")
        assert res_empty.status_code == 200
        assert res_empty.json()["purged_count"] >= 1

        # Trash should now be empty of this job
        res_trash = await client.get("/api/v1/trash")
        trash_ids = [j["job_id"] for j in res_trash.json()]
        assert job_id not in trash_ids


@pytest.mark.asyncio
async def test_ai_image_provider_synthesis(tmp_path):
    provider = AIImageProvider()
    assert provider.is_configured() is True
    assert provider.provider_name == "ai_image_generator"

    # Search for an AI image asset
    assets = await provider.search(
        query="cyberpunk neon metropolis",
        visual_hint="futuristic city with flying vehicles",
        aspect_ratio="16:9",
        avoid=[],
        min_duration=3.0,
    )

    assert len(assets) == 1
    asset = assets[0]
    assert asset.ai_generated is True
    assert asset.source_provider == "ai_image_generator"
    assert "pollinations" in asset.download_url or "ai" in asset.download_url

    # Download / synthesize into motion clip
    output_mp4 = str(tmp_path / "test_ai_clip.mp4")
    res_path = await provider.download_asset(asset, output_mp4)
    assert os.path.exists(res_path)
    assert os.path.getsize(res_path) > 1000
