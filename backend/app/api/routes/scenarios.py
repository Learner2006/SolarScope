"""Scenarios endpoints for baseline-isolated sensitivity analysis."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from backend.app.api.schemas.scenario import ScenarioRequestSchema, ScenarioResponseSchema
from backend.app.services.scenario_service import scenario_service

router = APIRouter(tags=["Scenarios"])


@router.post("/api/analyses/{analysis_id}/scenarios", response_model=ScenarioResponseSchema)
async def create_scenario(analysis_id: str, request: ScenarioRequestSchema):
    """Run a sensitivity scenario against an existing analysis baseline while preserving the original results."""
    try:
        result = scenario_service.run_scenario(analysis_id=analysis_id, request=request)
        if not result:
            raise HTTPException(status_code=404, detail=f"Analysis with ID '{analysis_id}' not found.")
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scenario evaluation failed: {str(e)}")
