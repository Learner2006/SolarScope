"""Simulations endpoint for solar generation calculations."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from backend.app.api.schemas.generation import GenerationResponseSchema
from backend.app.api.schemas.scope import ScopeInputSchema
from backend.app.services.generation_service import generation_service

router = APIRouter(tags=["Simulations"])


@router.post("/api/simulations", response_model=GenerationResponseSchema)
async def simulate_solar(
    scope: ScopeInputSchema,
    force_fixture: bool = Query(default=False, description="Force usage of local development benchmark fixture"),
):
    """Calculate hourly solar PV generation and monthly aggregations for the specified scope."""
    try:
        _, gen_response = await generation_service.simulate_generation(
            scope=scope,
            force_fixture=force_fixture,
        )
        return gen_response
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
