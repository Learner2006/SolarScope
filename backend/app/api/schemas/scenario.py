"""Scenario sensitivity request and response schemas."""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.api.schemas.analysis import FinancialResponseSchema


class ScenarioRequestSchema(BaseModel):
    """Specification for a sensitivity analysis scenario."""
    scenario_id: str = Field(description="Unique key for the scenario")
    scenario_name: str = Field(description="Display title for the scenario")
    description: str = Field(description="Explanation of scenario rationale")
    generation_pct_adjustment: Optional[float] = Field(
        default=None,
        description="Percentage adjustment to total annual generation (e.g. -15.0 for -15%)",
    )
    installation_cost_override: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Override turnkey installation cost in USD",
    )
    import_tariff_override: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Override retail electricity import price ($/kWh)",
    )
    export_tariff_override: Optional[float] = Field(
        default=None,
        ge=0.0,
        description="Override export compensation ($/kWh)",
    )
    self_consumption_pct_override: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Override self-consumption percentage (0-100%)",
    )


class ScenarioDeltaSchema(BaseModel):
    """Metric deltas comparing scenario to baseline."""
    generation_diff_kwh: float
    generation_diff_pct: float
    gross_savings_diff_usd: float
    gross_savings_diff_pct: float
    net_annual_benefit_diff_usd: float
    payback_diff_years: Optional[float]
    lifetime_cash_flow_diff_usd: float
    lifetime_cash_flow_diff_pct: float
    summary_message: str


class ScenarioResponseSchema(BaseModel):
    """Full scenario outcome containing baseline comparison and deltas."""
    scenario_id: str
    scenario_name: str
    description: str
    baseline_financials: FinancialResponseSchema
    scenario_financials: FinancialResponseSchema
    delta: ScenarioDeltaSchema
    warnings: List[str]
