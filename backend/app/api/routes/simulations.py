"""Simulations endpoint for solar generation calculations."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Query
from backend.app.api.schemas.generation import GenerationResponseSchema
from backend.app.api.schemas.scope import ScopeInputSchema
from backend.app.services.generation_service import generation_service
from backend.app.services.renewables_ninja import UpstreamServiceError

logger = logging.getLogger(__name__)

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
    except HTTPException:
        raise
    except UpstreamServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during simulation: %s", e)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while calculating solar generation.")
