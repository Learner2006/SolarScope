"""Analysis request and response schemas."""

from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.api.schemas.generation import GenerationResponseSchema
from backend.app.api.schemas.scope import ScopeInputSchema


class CashFlowPointSchema(BaseModel):
    """Annual cash flow entry for charting."""
    year: int
    net_annual_cash_flow: float
    cumulative_cash_flow: float


class FinancialResponseSchema(BaseModel):
    """Detailed financial outcomes and payback analysis."""
    installation_cost: float
    import_tariff: float
    export_tariff: float
    self_consumption_ratio: float
    annual_maintenance_cost: float
    project_lifetime_years: int
    total_generation_kwh: float
    self_consumed_kwh: float
    exported_kwh: float
    avoided_import_savings: float
    export_revenue: float
    gross_annual_savings: float
    net_annual_benefit: float
    simple_payback_years: Optional[float]
    is_payback_achievable: bool
    payback_status: str
    lifetime_total_generation_kwh: float
    lifetime_gross_savings: float
    lifetime_operating_costs: float
    lifetime_net_cash_flow: float
    roi_percentage: float
    lcoe_per_kwh: float
    currency_code: str = Field(default="USD", description="ISO 4217 currency code for financial modeling")
    cash_flow_timeline: List[CashFlowPointSchema]
    warnings: List[str]


class AnalysisResponse(BaseModel):
    """Complete analysis record containing scope, generation, financials, and provenance."""
    analysis_id: str = Field(description="Unique UUID for this analysis run")
    created_at: str = Field(description="ISO creation timestamp")
    scope: ScopeInputSchema
    generation: GenerationResponseSchema
    financials: FinancialResponseSchema
    scenarios: Dict[str, dict] = Field(default_factory=dict, description="Configured scenarios keyed by ID")
    all_warnings: List[str] = Field(default_factory=list)


class AnalysisSummaryResponse(BaseModel):
    """Compact summary for run history lists."""
    analysis_id: str
    created_at: str
    location_name: Optional[str]
    system_capacity_kw: float
    total_generation_kwh: float
    capacity_factor_pct: float
    net_annual_benefit: float
    simple_payback_years: Optional[float]
    is_live_retrieval: bool
