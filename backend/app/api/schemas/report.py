"""Report export response schema."""

from __future__ import annotations

from typing import Dict, List
from pydantic import BaseModel, Field
from backend.app.api.schemas.analysis import FinancialResponseSchema
from backend.app.api.schemas.generation import GenerationResponseSchema, ProvenanceSchema
from backend.app.api.schemas.scenario import ScenarioResponseSchema
from backend.app.api.schemas.scope import ScopeInputSchema


class ReportResponse(BaseModel):
    """Reproducible export document with complete formulas, inputs, results, and limitations."""
    analysis_id: str
    generated_at: str
    scope: ScopeInputSchema
    generation: GenerationResponseSchema
    financials: FinancialResponseSchema
    scenarios: List[ScenarioResponseSchema]
    provenance: ProvenanceSchema
    formulas_and_methodology: Dict[str, str] = Field(
        description="Dictionary of formulas used in calculation engine"
    )
    model_limitations: List[str] = Field(
        description="Explicit physical, economic, and reanalysis limitations"
    )
    data_quality_warnings: List[str] = Field(
        description="Warnings regarding data coverage, missing hours, or economic feasibility"
    )
    conclusions: List[str] = Field(
        description="Deterministic, transparent executive conclusions"
    )
