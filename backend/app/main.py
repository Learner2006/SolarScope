"""SolarScope FastAPI Application Entrypoint."""

from __future__ import annotations

import asyncio
import logging
import math
from typing import Any
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.api.routes import analyses, health, reports, scenarios, simulations
from backend.app.config import Settings, settings

logger = logging.getLogger(__name__)

# Concurrency Guard / DoS Prevention:
# Module-level semaphore instance matching default settings (imported in regression tests)
_SIMULATION_SEMAPHORE = asyncio.Semaphore(settings.MAX_CONCURRENT_SIMULATIONS)


def _sanitize_validation_error_input(obj: Any) -> Any:
    """Recursively convert NaN and Infinity float values to compliant JSON representations."""
    if isinstance(obj, float):
        if math.isnan(obj):
            return "NaN"
        if math.isinf(obj):
            return "Infinity" if obj > 0 else "-Infinity"
        return obj
    if isinstance(obj, dict):
        return {k: _sanitize_validation_error_input(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize_validation_error_input(v) for v in obj]
    return obj


def create_app(app_settings: Settings = settings) -> FastAPI:
    """FastAPI application factory for SolarScope."""
    application = FastAPI(
        title="SolarScope Analytical Engine API",
        description="High-precision solar feasibility, time-series aggregation, financial modeling, and scenario analysis engine.",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Use the module semaphore for default settings to preserve test mutation hooks,
    # or instantiate an isolated semaphore for custom settings.
    semaphore = _SIMULATION_SEMAPHORE if app_settings is settings else asyncio.Semaphore(app_settings.MAX_CONCURRENT_SIMULATIONS)

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Serialize validation errors safely, preventing NaN / Infinity values from causing HTTP 500 crashes."""
        encoded_errors = jsonable_encoder(exc.errors())
        sanitized_errors = _sanitize_validation_error_input(encoded_errors)
        return JSONResponse(
            status_code=422,
            content={"detail": sanitized_errors},
        )

    @application.middleware("http")
    async def concurrency_limit_middleware(request: Request, call_next):
        if request.url.path in ("/api/analyses", "/api/simulations") and request.method == "POST":
            if semaphore.locked() and semaphore._value <= 0:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "System busy: maximum concurrent simulations reached. Please retry in a few moments."},
                )
            async with semaphore:
                return await call_next(request)
        return await call_next(request)

    # Sanitize unhandled exceptions so internal stack traces or environment secrets are never leaked
    @application.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled server exception processing %s: %s", request.url.path, exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "An internal server error occurred while processing the request."},
        )

    # Configure CORS securely based on runtime environment
    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.all_cors_origins,
        allow_origin_regex=app_settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register route modules
    application.include_router(health.router)
    application.include_router(simulations.router)
    application.include_router(analyses.router)
    application.include_router(scenarios.router)
    application.include_router(reports.router)

    @application.get("/")
    async def root():
        """Root redirect and status."""
        return {
            "message": "SolarScope Analytical Engine API is running.",
            "docs": "/docs",
            "health": "/api/health",
        }

    return application


# Canonical application instance used by Uvicorn and tests
app = create_app(settings)
