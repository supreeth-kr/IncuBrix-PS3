from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.job import Job


class IdempotencyManager:
    @staticmethod
    async def get_existing_job(session: AsyncSession, idempotency_key: str) -> Optional[Job]:
        if not idempotency_key or not idempotency_key.strip():
            return None
        stmt = select(Job).where(Job.idempotency_key == idempotency_key.strip())
        result = await session.execute(stmt)
        return result.scalars().first()
