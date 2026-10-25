import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_broll_job_success(client: AsyncClient):
    payload = {
        "script": "Artificial intelligence creates beautiful B-roll video assets automatically.",
        "voice": "en-US-AriaNeural",
        "aspect_ratios": ["16:9"],
        "style": "modern, sleek",
        "project_name": "Test AI Project",
    }
    res = await client.post("/api/v1/broll/jobs", json=payload)
    assert res.status_code == 202
    data = res.json()
    assert "job_id" in data
    assert data["status"] == "queued"
    assert data["project_name"] == "Test AI Project"


@pytest.mark.asyncio
async def test_create_broll_job_invalid_input(client: AsyncClient):
    # Empty script without audio_url or scenes
    payload = {
        "script": "   ",
        "voice": "en-US-AriaNeural",
    }
    res = await client.post("/api/v1/broll/jobs", json=payload)
    assert res.status_code in (400, 422)
    data = res.json()
    assert "error" in data
    assert "code" in data["error"]
    assert "message" in data["error"]


@pytest.mark.asyncio
async def test_idempotency_key_prevents_duplicate(client: AsyncClient):
    payload = {
        "script": "Idempotency testing narration line for IncuBrix engine.",
        "project_name": "Idempotent Project",
    }
    headers = {"Idempotency-Key": "test-key-uuid-12345"}

    # First submission
    res1 = await client.post("/api/v1/broll/jobs", json=payload, headers=headers)
    assert res1.status_code == 202
    job_id_1 = res1.json()["job_id"]

    # Second submission with exact same key
    res2 = await client.post("/api/v1/broll/jobs", json=payload, headers=headers)
    assert res2.status_code in (200, 202)
    job_id_2 = res2.json()["job_id"]

    assert job_id_1 == job_id_2


@pytest.mark.asyncio
async def test_get_job_not_found(client: AsyncClient):
    res = await client.get("/api/v1/jobs/non-existent-job-id")
    assert res.status_code == 404
    data = res.json()
    assert data["error"]["code"] == "JOB_NOT_FOUND"


@pytest.mark.asyncio
async def test_health_and_readiness_endpoints(client: AsyncClient):
    res_health = await client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    res_ready = await client.get("/ready")
    assert res_ready.status_code in (200, 503)
    assert "checks" in res_ready.json()
