"""Solar PV generation aggregation, capacity factor calculations, and profile extraction."""

from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional
from backend.app.domain.time_series import TimeInterval, TimeSeriesValidationResult


@dataclass(frozen=True)
class MonthlyGenerationMetric:
    """Aggregated generation metrics for a single calendar month."""
    year: int
    month: int
    month_name: str
    month_label: str  # e.g. "2019-01"
    total_kwh: float
    peak_kw: float
    average_kw: float
    sunlight_hours: int  # Hours where generation > 0.005 kW
    total_hours: int
    capacity_factor_pct: float
    daily_average_kwh: float


@dataclass(frozen=True)
class HourlyProfilePoint:
    """Single hourly point for interactive drill-down inspection."""
    timestamp: str  # ISO string
    hour: int
    day: int
    month: int
    generation_kw: float


@dataclass(frozen=True)
class GenerationSummary:
    """Comprehensive generation metrics across the entire analysis period."""
    system_capacity_kw: float
    total_generation_kwh: float
    total_generation_mwh: float
    period_hours: float
    capacity_factor_pct: float
    peak_power_kw: float
    peak_timestamp: Optional[str]
    daily_average_kwh: float
    monthly_breakdown: List[MonthlyGenerationMetric]
    weakest_month: MonthlyGenerationMetric
    strongest_month: MonthlyGenerationMetric
    validation: TimeSeriesValidationResult
    # Map of month (1-12) to list of hourly points for drilldown
    hourly_profiles_by_month: Dict[int, List[HourlyProfilePoint]] = field(default_factory=dict)


def aggregate_generation(
    intervals: List[TimeInterval],
    system_capacity_kw: float,
    validation: TimeSeriesValidationResult,
    base_sim_capacity_kw: float = 1.0,
) -> GenerationSummary:
    """Aggregate raw time-series intervals into period-level and monthly metrics.

    Parameters
    ----------
    intervals : List[TimeInterval]
        Chronological hourly intervals.
    system_capacity_kw : float
        Target installed solar system capacity in kW.
    validation : TimeSeriesValidationResult
        Validation outcome from time_series module.
    base_sim_capacity_kw : float
        Capacity of the base simulation (defaults to 1.0 kW if scaled).

    Returns
    -------
    GenerationSummary
        Aggregated numerical generation results.
    """
    if system_capacity_kw <= 0:
        raise ValueError(f"System capacity must be greater than 0, got {system_capacity_kw}")

    # Scaling factor from 1 kW base simulation to requested capacity
    scale = system_capacity_kw / base_sim_capacity_kw if base_sim_capacity_kw > 0 else 1.0

    if not intervals:
        empty_month = MonthlyGenerationMetric(
            year=2020,
            month=1,
            month_name="None",
            month_label="None",
            total_kwh=0.0,
            peak_kw=0.0,
            average_kw=0.0,
            sunlight_hours=0,
            total_hours=0,
            capacity_factor_pct=0.0,
            daily_average_kwh=0.0,
        )
        return GenerationSummary(
            system_capacity_kw=system_capacity_kw,
            total_generation_kwh=0.0,
            total_generation_mwh=0.0,
            period_hours=0.0,
            capacity_factor_pct=0.0,
            peak_power_kw=0.0,
            peak_timestamp=None,
            daily_average_kwh=0.0,
            monthly_breakdown=[],
            weakest_month=empty_month,
            strongest_month=empty_month,
            validation=validation,
            hourly_profiles_by_month={},
        )

    # Group intervals by (year, month)
    monthly_groups: Dict[tuple[int, int], List[TimeInterval]] = {}
    hourly_profiles: Dict[int, List[HourlyProfilePoint]] = {}

    total_kwh = 0.0
    peak_kw = 0.0
    peak_dt: Optional[datetime] = None

    for interval in intervals:
        scaled_power = round(interval.power_kw * scale, 4)
        scaled_energy = round(interval.energy_kwh * scale, 4)

        total_kwh += scaled_energy
        if scaled_power > peak_kw:
            peak_kw = scaled_power
            peak_dt = interval.timestamp

        ym = (interval.timestamp.year, interval.timestamp.month)
        if ym not in monthly_groups:
            monthly_groups[ym] = []
        monthly_groups[ym].append(interval)

        m = interval.timestamp.month
        if m not in hourly_profiles:
            hourly_profiles[m] = []
        hourly_profiles[m].append(
            HourlyProfilePoint(
                timestamp=interval.timestamp.isoformat(),
                hour=interval.timestamp.hour,
                day=interval.timestamp.day,
                month=m,
                generation_kw=scaled_power,
            )
        )

    # Build monthly metrics
    monthly_metrics: List[MonthlyGenerationMetric] = []
    for (year, month), m_intervals in sorted(monthly_groups.items()):
        m_kwh = sum(i.energy_kwh * scale for i in m_intervals)
        m_peak = max((i.power_kw * scale for i in m_intervals), default=0.0)
        m_count = len(m_intervals)
        m_sunlight = sum(1 for i in m_intervals if (i.power_kw * scale) > 0.005)

        # Capacity factor for the month:
        # CF = Total Energy (kWh) / (System Capacity (kW) * Total Hours in month)
        m_cf = (m_kwh / (system_capacity_kw * m_count) * 100.0) if m_count > 0 else 0.0
        days_in_m = calendar.monthrange(year, month)[1]
        daily_avg = m_kwh / days_in_m if days_in_m > 0 else 0.0

        monthly_metrics.append(
            MonthlyGenerationMetric(
                year=year,
                month=month,
                month_name=calendar.month_name[month],
                month_label=f"{year}-{month:02d}",
                total_kwh=round(m_kwh, 2),
                peak_kw=round(m_peak, 3),
                average_kw=round(m_kwh / m_count, 3) if m_count > 0 else 0.0,
                sunlight_hours=m_sunlight,
                total_hours=m_count,
                capacity_factor_pct=round(m_cf, 2),
                daily_average_kwh=round(daily_avg, 2),
            )
        )

    # Calculate overall capacity factor:
    # CF = Total Energy (kWh) / (Rated Capacity (kW) * Actual Period Hours)
    actual_hours = validation.actual_hours
    overall_cf = (
        (total_kwh / (system_capacity_kw * actual_hours) * 100.0)
        if (actual_hours > 0 and system_capacity_kw > 0)
        else 0.0
    )

    days_in_period = max(1.0, actual_hours / 24.0)
    daily_avg_total = total_kwh / days_in_period

    weakest = min(monthly_metrics, key=lambda m: m.total_kwh) if monthly_metrics else None
    strongest = max(monthly_metrics, key=lambda m: m.total_kwh) if monthly_metrics else None

    return GenerationSummary(
        system_capacity_kw=system_capacity_kw,
        total_generation_kwh=round(total_kwh, 2),
        total_generation_mwh=round(total_kwh / 1000.0, 3),
        period_hours=actual_hours,
        capacity_factor_pct=round(overall_cf, 2),
        peak_power_kw=round(peak_kw, 3),
        peak_timestamp=peak_dt.isoformat() if peak_dt else None,
        daily_average_kwh=round(daily_avg_total, 2),
        monthly_breakdown=monthly_metrics,
        weakest_month=weakest if weakest else monthly_metrics[0],
        strongest_month=strongest if strongest else monthly_metrics[0],
        validation=validation,
        hourly_profiles_by_month=hourly_profiles,
    )
