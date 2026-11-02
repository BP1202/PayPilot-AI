from fastapi import FastAPI

from app.api.v1.router import api_v1_router
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
)


# Root status
@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "status": "running",
    }


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": f"{settings.APP_NAME} Backend",
    }


# API v1 health check
@app.get(f"{settings.API_V1_PREFIX}/health")
async def api_v1_health():
    return {
        "status": "healthy",
        "application": settings.APP_NAME,
        "environment": settings.APP_ENV,
    }


# Include API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
