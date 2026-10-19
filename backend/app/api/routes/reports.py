"""Reports endpoints for reproducible audit data export."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from backend.app.api.schemas.report import ReportResponse
from backend.app.services.report_service import report_service

router = APIRouter(tags=["Reports"])


@router.get("/api/analyses/{analysis_id}/report", response_model=ReportResponse)
async def get_report(analysis_id: str):
    """Retrieve complete, reproducible report data for an analysis run."""
    report = report_service.generate_report(analysis_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Analysis with ID '{analysis_id}' not found.")
    return report
