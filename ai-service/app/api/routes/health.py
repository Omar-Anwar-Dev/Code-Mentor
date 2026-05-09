# Health check endpoints
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime


health_router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    timestamp: str


@health_router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health status."""
    return HealthResponse(
        status="healthy",
        service="static-analysis-service",
        timestamp=datetime.utcnow().isoformat()
    )


@health_router.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - redirects to health."""
    return await health_check()
