from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.scenes import router as scenes_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(jobs_router)
api_v1_router.include_router(scenes_router)

__all__ = ["api_v1_router"]
