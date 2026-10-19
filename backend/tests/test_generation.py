"""Tests for time-series parsing, leap-year calculations, and solar generation aggregation."""

from datetime import date
import pytest
from backend.app.domain.generation import aggregate_generation
from backend.app.domain.time_series import (
    calculate_expected_hours,
    validate_time_series,
)


def test_calculate_expected_hours_non_leap_year():
    """Verify non-leap year (e.g. 2019, 365 days) has exactly 8,760 hours."""
    hours = calculate_expected_hours(date(2019, 1, 1), date(2019, 12, 31))
    assert hours == 8760


def test_calculate_expected_hours_leap_year():
    """Verify leap year (e.g. 2020, 2024, 366 days) has exactly 8,784 hours, NOT 8,760."""
    hours_2020 = calculate_expected_hours(date(2020, 1, 1), date(2020, 12, 31))
    assert hours_2020 == 8784

    hours_2024 = calculate_expected_hours(date(2024, 1, 1), date(2024, 12, 31))
    assert hours_2024 == 8784


def test_calculate_expected_hours_partial_month():
    """Verify partial period: January 1 to January 31 is 31 days * 24 = 744 hours."""
    hours = calculate_expected_hours(date(2023, 1, 1), date(2023, 1, 31))
    assert hours == 744


def test_time_series_validation_with_fixture(sample_pv_data, standard_dates):
    """Verify loading real fixture data: checks continuity, interval count, and warnings."""
    start_d, end_d = standard_dates
    raw_data = sample_pv_data["data"]

    intervals, val_result = validate_time_series(raw_data, start_d, end_d)

    assert len(intervals) == 8760
    assert val_result.total_intervals == 8760
    assert val_result.expected_intervals == 8760
    assert val_result.missing_intervals == 0
    assert val_result.is_continuous is True
    assert val_result.actual_hours == 8760.0


def test_missing_intervals_detection():
    """Verify that when data contains missing intervals, it reports them explicitly without fabricating."""
    sparse_data = {
        "2019-01-01 00:00": {"electricity": 0.0},
        "2019-01-01 01:00": {"electricity": 0.0},
        "2019-01-01 12:00": {"electricity": 0.75},
    }
    start_d = date(2019, 1, 1)
    end_d = date(2019, 1, 1)  # 24 hours expected

    intervals, val_result = validate_time_series(sparse_data, start_d, end_d)

    assert len(intervals) == 3
    assert val_result.expected_intervals == 24
    assert val_result.missing_intervals == 21
    assert val_result.is_continuous is False
    assert any("21 missing hours" in w for w in val_result.warnings)


def test_capacity_factor_calculation():
    """Verify capacity factor matches manual arithmetic:
    1 kW system, 24 hours, generation 4.8 kWh:
    CF = 4.8 / (1 kW * 24 h) = 0.20 (20.0%).
    """
    raw_data = {f"2019-06-01 {h:02d}:00": {"electricity": 0.2} for h in range(24)}
    start_d = date(2019, 6, 1)
    end_d = date(2019, 6, 1)

    intervals, val = validate_time_series(raw_data, start_d, end_d)
    summary = aggregate_generation(intervals, system_capacity_kw=1.0, validation=val)

    # 24 * 0.2 = 4.8 kWh
    assert summary.total_generation_kwh == 4.8
    assert summary.period_hours == 24.0
    # CF = 4.8 / (1.0 * 24) = 20.0%
    assert summary.capacity_factor_pct == 20.0


def test_capacity_scaling(sample_pv_data, standard_dates):
    """Verify scaling from 1 kW base simulation to 5 kW installed capacity."""
    start_d, end_d = standard_dates
    intervals, val = validate_time_series(sample_pv_data["data"], start_d, end_d)

    summary_1kw = aggregate_generation(intervals, system_capacity_kw=1.0, validation=val)
    summary_5kw = aggregate_generation(intervals, system_capacity_kw=5.0, validation=val)

    # Total generation should scale by exactly 5.0
    assert pytest.approx(summary_5kw.total_generation_kwh, rel=1e-3) == summary_1kw.total_generation_kwh * 5.0
    # Capacity factor percentage should be invariant under linear scaling
    assert pytest.approx(summary_5kw.capacity_factor_pct, rel=1e-3) == summary_1kw.capacity_factor_pct
    # Monthly breakdown must have 12 months
    assert len(summary_5kw.monthly_breakdown) == 12
    # Strongest month should generate more than weakest month
    assert summary_5kw.strongest_month.total_kwh > summary_5kw.weakest_month.total_kwh


def test_system_losses_derate_scaling(sample_pv_data, standard_dates):
    """Verify system losses derate calculation: 20% losses vs 10% base scales generation by 0.80/0.90."""
    start_d, end_d = standard_dates
    intervals, val = validate_time_series(sample_pv_data["data"], start_d, end_d)

    summary_10pct = aggregate_generation(intervals, system_capacity_kw=5.0, validation=val, system_losses_pct=10.0)
    summary_20pct = aggregate_generation(intervals, system_capacity_kw=5.0, validation=val, system_losses_pct=20.0)

    expected_ratio = (1.0 - 0.20) / (1.0 - 0.10)  # 0.80 / 0.90 = 0.8888...
    assert pytest.approx(summary_20pct.total_generation_kwh / summary_10pct.total_generation_kwh, rel=1e-3) == expected_ratio

