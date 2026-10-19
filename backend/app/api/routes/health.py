"""Health and runtime diagnostics endpoint."""

from __future__ import annotations

from fastapi import APIRouter
from backend.app.config import settings
from backend.app.services.renewables_ninja import ninja_adapter

router = APIRouter(tags=["Health"])


@router.get("/api/health")
async def health_check():
    """Returns application status, version, and external API configuration status."""
    return {
        "status": "healthy",
        "service": "SolarScope Analytical Engine",
        "version": "0.1.0",
        "environment": settings.ENVIRONMENT,
        "renewables_ninja": {
            "token_configured": ninja_adapter.is_api_configured(),
            "default_dataset": settings.DEFAULT_DATASET,
            "mode": "live_api" if ninja_adapter.is_api_configured() else "fixture_benchmark",
        },
    }
