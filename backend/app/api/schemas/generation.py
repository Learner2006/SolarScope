"""Generation output schemas."""

from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ProvenanceSchema(BaseModel):
    """Source data traceability and citation metadata."""
    source_type: str = Field(description="e.g. 'renewables_ninja_api' or 'local_fixture'")
    dataset_name: str = Field(description="Weather dataset used, e.g. 'merra2'")
    retrieval_timestamp: str = Field(description="ISO timestamp of data retrieval")
    attribution: str = Field(description="Academic citation and licence requirements")
    coordinates_used: str = Field(description="Latitude and longitude used for simulation")
    is_live_retrieval: bool = Field(description="True if fetched live from Renewables.ninja")


class MonthlyMetricSchema(BaseModel):
    """Monthly generation breakdown item."""
    year: int
    month: int
    month_name: str
    month_label: str
    total_kwh: float
    peak_kw: float
    average_kw: float
    sunlight_hours: int
    total_hours: int
    capacity_factor_pct: float
    daily_average_kwh: float


class HourlyPointSchema(BaseModel):
    """Single hourly generation point for interactive drill-down."""
    timestamp: str
    hour: int
    day: int
    month: int
    generation_kw: float


class ValidationReportSchema(BaseModel):
    """Data integrity and continuity checks."""
    total_intervals: int
    expected_intervals: int
    missing_intervals: int
    is_continuous: bool
    start_time: Optional[str]
    end_time: Optional[str]
    actual_hours: float
    warnings: List[str]


class GenerationResponseSchema(BaseModel):
    """Aggregated generation simulation results."""
    system_capacity_kw: float
    total_generation_kwh: float
    total_generation_mwh: float
    period_hours: float
    capacity_factor_pct: float
    peak_power_kw: float
    peak_timestamp: Optional[str]
    daily_average_kwh: float
    monthly_breakdown: List[MonthlyMetricSchema]
    weakest_month: MonthlyMetricSchema
    strongest_month: MonthlyMetricSchema
    validation: ValidationReportSchema
    provenance: ProvenanceSchema
    hourly_profiles_by_month: Dict[int, List[HourlyPointSchema]]
