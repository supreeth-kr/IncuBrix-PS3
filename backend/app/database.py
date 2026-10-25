import os
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Ensure local data directory exists for SQLite
if "sqlite" in settings.DATABASE_URL:
    db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
    db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

# Ensure storage directory exists
os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


from sqlalchemy import text


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate existing SQLite tables if new columns are missing
        if "sqlite" in settings.DATABASE_URL:
            try:
                res = await conn.execute(text("PRAGMA table_info(jobs)"))
                columns = {row[1] for row in res.fetchall()}
                if "is_deleted" not in columns:
                    await conn.execute(text("ALTER TABLE jobs ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
                if "deleted_at" not in columns:
                    await conn.execute(text("ALTER TABLE jobs ADD COLUMN deleted_at DATETIME DEFAULT NULL"))
                if "visual_source" not in columns:
                    await conn.execute(text("ALTER TABLE jobs ADD COLUMN visual_source VARCHAR(64) DEFAULT 'ai_images'"))
            except Exception:
                pass
