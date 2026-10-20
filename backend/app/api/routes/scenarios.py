"""Scenarios endpoints for baseline-isolated sensitivity analysis."""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Query
from backend.app.api.schemas.scenario import ScenarioRequestSchema, ScenarioResponseSchema
from backend.app.services.scenario_service import scenario_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Scenarios"])


@router.post("/api/analyses/{analysis_id}/scenarios", response_model=ScenarioResponseSchema)
async def create_scenario(
    analysis_id: str,
    request: ScenarioRequestSchema,
    auto_id: bool = Query(default=False, description="Automatically generate a unique scenario ID if a collision occurs"),
):
    """Run a sensitivity scenario against an existing analysis baseline while preserving the original results."""
    try:
        # Prevent scenario-ID collisions from silently overwriting existing scenarios
        existing = scenario_service.get_scenario(analysis_id, request.scenario_id)
        if existing and not auto_id:
            raise HTTPException(
                status_code=409,
                detail=f"Scenario with ID '{request.scenario_id}' already exists for analysis '{analysis_id}'. Choose a distinct scenario ID or pass auto_id=true to generate a unique identifier.",
            )
        result = scenario_service.run_scenario(analysis_id=analysis_id, request=request, auto_id=auto_id)
        if not result:
            raise HTTPException(status_code=404, detail=f"Analysis with ID '{analysis_id}' not found.")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during scenario evaluation: %s", e)
        raise HTTPException(status_code=500, detail="An unexpected error occurred during scenario evaluation.")
