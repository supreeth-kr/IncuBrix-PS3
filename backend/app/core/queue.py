import asyncio
from typing import Optional
from app.core.logging import get_logger

logger = get_logger("job_queue")


class JobQueue:
    _queue: asyncio.Queue = asyncio.Queue()

    @classmethod
    async def enqueue(cls, job_id: str) -> None:
        await cls._queue.put(job_id)
        logger.info(f"Enqueued job {job_id} for processing.")

    @classmethod
    async def get_next(cls) -> str:
        return await cls._queue.get()

    @classmethod
    def task_done(cls) -> None:
        cls._queue.task_done()
