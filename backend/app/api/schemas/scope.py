"""Scope definition request schemas and validators."""

from __future__ import annotations

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, model_validator
from backend.app.config import settings


class ScopeInputSchema(BaseModel):
    """User-configured scope for a solar feasibility run."""
    location_name: Optional[str] = Field(
        default="San Francisco, CA",
        max_length=200,
        description="Descriptive location name or address",
    )
    latitude: float = Field(
        default=37.7749,
        ge=-90.0,
        le=90.0,
        description="Site latitude in decimal degrees (-90 to +90)",
    )
    longitude: float = Field(
        default=-122.4194,
        ge=-180.0,
        le=180.0,
        description="Site longitude in decimal degrees (-180 to +180)",
    )
    start_date: date = Field(
        default=date(2019, 1, 1),
        description="Analysis period start date (YYYY-MM-DD)",
    )
    end_date: date = Field(
        default=date(2019, 12, 31),
        description="Analysis period end date (YYYY-MM-DD)",
    )
    system_capacity_kw: float = Field(
        default=5.0,
        gt=0.0,
        le=500.0,
        description="Rated solar PV system capacity in kW DC",
    )
    tilt_degrees: float = Field(
        default=30.0,
        ge=0.0,
        le=90.0,
        description="Panel tilt angle in degrees from horizontal (0 = flat, 90 = vertical)",
    )
    azimuth_degrees: float = Field(
        default=180.0,
        ge=0.0,
        le=360.0,
        description="Panel orientation azimuth angle (180 = South, 90 = East, 270 = West)",
    )
    system_losses_pct: float = Field(
        default=10.0,
        ge=0.0,
        le=50.0,
        description="Total system losses percentage (inverter, wiring, soiling derate)",
    )
    installation_cost: float = Field(
        default=7500.0,
        ge=0.0,
        le=50_000_000.0,
        description="Turnkey total installation and hardware capital cost in specified currency",
    )
    import_tariff: float = Field(
        default=0.28,
        ge=0.0,
        le=500.0,
        description="Retail electricity import price (currency/kWh) offset by self-consumption",
    )
    export_tariff: float = Field(
        default=0.06,
        ge=0.0,
        le=500.0,
        description="Feed-in tariff or export compensation (currency/kWh) received for grid feed",
    )
    self_consumption_pct: float = Field(
        default=65.0,
        ge=0.0,
        le=100.0,
        description="Percentage of solar generation consumed on-site",
    )
    annual_maintenance_cost: float = Field(
        default=75.0,
        ge=0.0,
        le=5_000_000.0,
        description="Expected recurring annual maintenance and insurance (currency/year)",
    )
    project_lifetime_years: int = Field(
        default=25,
        ge=5,
        le=40,
        description="Project operational economic lifetime in years",
    )
    currency_code: str = Field(
        default="USD",
        min_length=3,
        max_length=10,
        description="ISO 4217 currency code for financial modeling (e.g. 'USD', 'INR', 'EUR', 'GBP')",
    )

    @model_validator(mode="after")
    def validate_dates(self) -> ScopeInputSchema:
        if self.end_date < self.start_date:
            raise ValueError(
                f"end_date ({self.end_date}) cannot be earlier than start_date ({self.start_date})"
            )
        total_days = (self.end_date - self.start_date).days + 1
        if total_days > settings.MAX_SIMULATION_DAYS:
            raise ValueError(
                f"Simulation period cannot exceed {settings.MAX_SIMULATION_DAYS} days (requested {total_days} days). "
                "Renewables.ninja limits single simulations to 1 year."
            )
        return self
