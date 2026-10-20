"""Analyses endpoints for end-to-end solar feasibility runs."""

from __future__ import annotations

import logging
from typing import List
from fastapi import APIRouter, HTTPException, Query
from backend.app.api.schemas.analysis import AnalysisResponse, AnalysisSummaryResponse
from backend.app.api.schemas.scope import ScopeInputSchema
from backend.app.services.analysis_service import analysis_service
from backend.app.services.renewables_ninja import UpstreamServiceError

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Analyses"])


@router.post("/api/analyses", response_model=AnalysisResponse, status_code=201)
async def create_analysis(
    scope: ScopeInputSchema,
    force_fixture: bool = Query(default=False, description="Force usage of local development benchmark fixture"),
):
    """Execute end-to-end solar generation and financial feasibility analysis."""
    try:
        return await analysis_service.create_analysis(scope=scope, force_fixture=force_fixture)
    except HTTPException:
        raise
    except UpstreamServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error creating analysis: %s", e)
        raise HTTPException(status_code=500, detail="An unexpected error occurred while executing the solar analysis.")


@router.get("/api/analyses/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    """Retrieve full results of an existing analysis run."""
    analysis = analysis_service.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis with ID '{analysis_id}' not found.")
    return analysis


@router.get("/api/analyses", response_model=List[AnalysisSummaryResponse])
async def list_analyses():
    """List summaries of previous analysis runs."""
    return analysis_service.list_analyses()
