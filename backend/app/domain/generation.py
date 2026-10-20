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
    unrounded_kwh: Optional[float] = None


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
    total_unrounded_kwh: Optional[float] = None


def aggregate_generation(
    intervals: List[TimeInterval],
    system_capacity_kw: float,
    validation: TimeSeriesValidationResult,
    base_sim_capacity_kw: float = 1.0,
    system_losses_pct: float = 10.0,
    base_system_loss_pct: float = 10.0,
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
    system_losses_pct : float
        User-specified system losses percentage (derate).
    base_system_loss_pct : float
        Baseline system losses embedded in the underlying simulation dataset (default 10%).

    Returns
    -------
    GenerationSummary
        Aggregated numerical generation results.
    """
    if system_capacity_kw <= 0:
        raise ValueError(f"System capacity must be greater than 0, got {system_capacity_kw}")

    # Architectural Decision / Baseline Derate Normalization:
    # Both the historical MERRA-2 fixture and theoretical clear-sky engine embed a 10% baseline system loss.
    # Rather than compounding user losses on top of this baseline, we normalize user losses relative
    # to the baseline delivery factor: (1 - user_loss) / (1 - base_loss).
    # This prevents double-counting losses while letting users test lower (e.g. 5%) or higher (e.g. 20%) losses.
    base_delivery = max(0.01, 1.0 - (base_system_loss_pct / 100.0))
    user_delivery = max(0.0, 1.0 - (system_losses_pct / 100.0))
    loss_scale = user_delivery / base_delivery

    # Linear scaling factor from 1 kW base simulation to user-requested nameplate capacity
    capacity_scale = system_capacity_kw / base_sim_capacity_kw if base_sim_capacity_kw > 0 else 1.0
    scale = capacity_scale * loss_scale

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

    # Precision & Reconciliation Decision:
    # We accumulate unrounded monthly energy floats and derive the annual period total directly from their sum.
    # Summing 8,760 interval-rounded floats causes an accumulation drift of ~0.02 kWh relative to monthly totals.
    # Accumulating unrounded monthly energy guarantees the annual summary and the monthly breakdown reconcile identically.
    monthly_metrics: List[MonthlyGenerationMetric] = []
    unrounded_monthly_totals: List[float] = []

    for (year, month), m_intervals in sorted(monthly_groups.items()):
        m_kwh_unrounded = sum(i.energy_kwh * scale for i in m_intervals)
        unrounded_monthly_totals.append(m_kwh_unrounded)

        m_peak = max((i.power_kw * scale for i in m_intervals), default=0.0)
        m_count = len(m_intervals)
        m_sunlight = sum(1 for i in m_intervals if (i.power_kw * scale) > 0.005)

        # Domain Rule / Leap-Year & Partial-Period Accuracy:
        # Monthly capacity factor divides by the actual interval count in that month (`m_count`),
        # accounting for 672 hours in February (28 days) vs 696 hours in leap February (29 days).
        # Daily averages use the actual number of included days (`m_count / 24.0`) so partial periods
        # (e.g. 5 days of a 31-day month) are not distorted by dividing by the whole calendar month.
        m_cf = (m_kwh_unrounded / (system_capacity_kw * m_count) * 100.0) if (m_count > 0 and system_capacity_kw > 0) else 0.0

        actual_days_in_m = max(1.0 / 24.0, m_count / 24.0)
        daily_avg = m_kwh_unrounded / actual_days_in_m if actual_days_in_m > 0 else 0.0

        monthly_metrics.append(
            MonthlyGenerationMetric(
                year=year,
                month=month,
                month_name=calendar.month_name[month],
                month_label=f"{year}-{month:02d}",
                total_kwh=round(m_kwh_unrounded, 2),
                peak_kw=round(m_peak, 3),
                average_kw=round(m_kwh_unrounded / m_count, 3) if m_count > 0 else 0.0,
                sunlight_hours=m_sunlight,
                total_hours=m_count,
                capacity_factor_pct=round(m_cf, 2),
                daily_average_kwh=round(daily_avg, 2),
                unrounded_kwh=m_kwh_unrounded,
            )
        )

    # Reconcile unrounded annual generation: exact sum of the 12 unrounded monthly generation values
    total_unrounded_kwh = sum(unrounded_monthly_totals)
    actual_hours = validation.actual_hours

    # Annual capacity factor based on total modeled-period hours
    overall_cf = (
        (total_unrounded_kwh / (system_capacity_kw * actual_hours) * 100.0)
        if (actual_hours > 0 and system_capacity_kw > 0)
        else 0.0
    )

    days_in_period = max(1.0, actual_hours / 24.0)
    daily_avg_total = total_unrounded_kwh / days_in_period

    # Weakest/strongest month selection:
    # Use daily average rate rather than unadjusted total kWh so incomplete boundary months
    # (e.g. 3 days of March vs 30 days of April) do not distort weakest-month scenario stress calibration.
    weakest = min(monthly_metrics, key=lambda m: (m.daily_average_kwh, m.total_kwh)) if monthly_metrics else None
    strongest = max(monthly_metrics, key=lambda m: (m.daily_average_kwh, m.total_kwh)) if monthly_metrics else None

    return GenerationSummary(
        system_capacity_kw=system_capacity_kw,
        total_generation_kwh=round(total_unrounded_kwh, 2),
        total_generation_mwh=round(total_unrounded_kwh / 1000.0, 3),
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
        total_unrounded_kwh=total_unrounded_kwh,
    )
