"""SolarScope FastAPI Application Entrypoint."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.routes import analyses, health, reports, scenarios, simulations
from backend.app.config import settings

app = FastAPI(
    title="SolarScope Analytical Engine API",
    description="High-precision solar feasibility, time-series aggregation, financial modeling, and scenario analysis engine.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS explicitly
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(health.router)
app.include_router(simulations.router)
app.include_router(analyses.router)
app.include_router(scenarios.router)
app.include_router(reports.router)


@app.get("/")
async def root():
    """Root redirect and status."""
    return {
        "message": "SolarScope Analytical Engine API is running.",
        "docs": "/docs",
        "health": "/api/health",
    }
