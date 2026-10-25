from contextlib import asynccontextmanager
import time
import uuid
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.api.v1 import api_v1_router
from app.api.v1.health import health_check, readiness_check
from app.config import get_settings
from app.core.logging import correlation_id_ctx, get_logger, setup_logging
from app.core.worker import JobWorker
from app.database import init_db
from app.schemas.error import AppException, ErrorDetail, ErrorResponse

settings = get_settings()
setup_logging(level="DEBUG" if settings.DEBUG else "INFO")
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialise database tables and start worker loop
    logger.info("Initializing database schemas...")
    await init_db()
    logger.info("Starting background worker...")
    JobWorker.start()
    yield
    # Shutdown: stop background worker
    logger.info("Stopping background worker...")
    JobWorker.stop()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Engine that turns written scripts or voiceovers into finished B-roll videos.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Idempotency-Key", "X-Correlation-Id"],
)


# Correlation ID Middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    corr_id = request.headers.get("X-Correlation-Id") or str(uuid.uuid4())
    token = correlation_id_ctx.set(corr_id)
    start_time = time.time()
    try:
        response = await call_next(request)
        response.headers["X-Correlation-Id"] = corr_id
        duration = round((time.time() - start_time) * 1000, 2)
        response.headers["X-Response-Time-Ms"] = str(duration)
        return response
    finally:
        correlation_id_ctx.reset(token)


# Custom AppException Handler
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "retryable": exc.retryable,
                "details": exc.details,
            }
        },
    )


# Pydantic Validation Error Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        errors.append({"location": loc, "message": err.get("msg", "Validation error"), "type": err.get("type", "")})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed. Please check the supplied parameters.",
                "retryable": False,
                "details": {"validation_errors": errors},
            }
        },
    )


# Starlette HTTP Exception Handler
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    code_map = {
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        413: "PAYLOAD_TOO_LARGE",
        500: "INTERNAL_SERVER_ERROR",
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code_map.get(exc.status_code, f"HTTP_{exc.status_code}"),
                "message": str(exc.detail),
                "retryable": exc.status_code >= 500,
                "details": {},
            }
        },
    )


# General Unhandled Exception Handler
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred.",
                "retryable": True,
                "details": {"error_type": type(exc).__name__},
            }
        },
    )


# Include API Routers
app.include_router(api_v1_router)

# Root level health/ready aliases for standard monitoring
app.add_api_route("/health", health_check, methods=["GET"], tags=["Health"])
app.add_api_route("/ready", readiness_check, methods=["GET"], tags=["Health"])
