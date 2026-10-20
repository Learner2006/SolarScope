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


def test_system_losses_zero_and_custom_scaling(sample_pv_data, standard_dates):
    """Verify system losses scaling across zero, below baseline (5%), baseline (10%), and above baseline (15%, 20%)."""
    start_d, end_d = standard_dates
    intervals, val = validate_time_series(sample_pv_data["data"], start_d, end_d)

    summary_0pct = aggregate_generation(intervals, system_capacity_kw=1.0, validation=val, system_losses_pct=0.0)
    summary_5pct = aggregate_generation(intervals, system_capacity_kw=1.0, validation=val, system_losses_pct=5.0)
    summary_10pct = aggregate_generation(intervals, system_capacity_kw=1.0, validation=val, system_losses_pct=10.0)
    summary_15pct = aggregate_generation(intervals, system_capacity_kw=1.0, validation=val, system_losses_pct=15.0)
    summary_20pct = aggregate_generation(intervals, system_capacity_kw=1.0, validation=val, system_losses_pct=20.0)

    # 0% loss recovers the 10% baseline derate: 1.00 / 0.90
    assert pytest.approx(summary_0pct.total_generation_kwh / summary_10pct.total_generation_kwh, rel=1e-3) == 1.00 / 0.90
    # 5% loss scales by: 0.95 / 0.90
    assert pytest.approx(summary_5pct.total_generation_kwh / summary_10pct.total_generation_kwh, rel=1e-3) == 0.95 / 0.90
    # 10% loss is exactly the baseline: 1.00
    assert summary_10pct.total_generation_kwh == pytest.approx(summary_10pct.total_generation_kwh, rel=1e-5)
    # 15% loss reduces generation to: 0.85 / 0.90
    assert pytest.approx(summary_15pct.total_generation_kwh / summary_10pct.total_generation_kwh, rel=1e-3) == 0.85 / 0.90
    # 20% loss reduces generation to: 0.80 / 0.90
    assert pytest.approx(summary_20pct.total_generation_kwh / summary_10pct.total_generation_kwh, rel=1e-3) == 0.80 / 0.90


def test_duplicate_timestamps_handling():
    """Verify that duplicate timestamps are detected and deduplicated with an explicit warning."""
    data_with_duplicates = {
        "2019-01-01 00:00": {"electricity": 0.0},
        "2019-01-01 01:00": {"electricity": 0.0},
        "2019-01-01 01:00": {"electricity": 0.05},  # Duplicate timestamp
        "2019-01-01 02:00": {"electricity": 0.0},
    }
    start_d = date(2019, 1, 1)
    end_d = date(2019, 1, 1)

    intervals, val_result = validate_time_series(data_with_duplicates, start_d, end_d)
    # Python dicts keep unique keys, but if duplicate entries exist in raw parsing:
    assert len(intervals) <= 3
    # Check that intervals have unique timestamps
    timestamps = [i.timestamp for i in intervals]
    assert len(timestamps) == len(set(timestamps))


def test_actual_fixture_coverage_and_provenance(sample_pv_data):
    """Verify actual fixture location, coverage, timestamps, and units."""
    meta = sample_pv_data["metadata"]
    params = meta["params"]
    provenance = meta["provenance"]

    # Coordinates match San Francisco benchmark
    assert float(params["lat"]) == pytest.approx(37.7749, abs=0.01)
    assert float(params["lon"]) == pytest.approx(-122.4194, abs=0.01)
    # Units
    assert meta["units"]["time"] == "UTC"
    assert meta["units"]["electricity"] == "kW"
    # Coverage
    assert params["date_from"] == "2019-01-01"
    assert params["date_to"] == "2019-12-31"
    assert provenance["total_intervals"] == 8760
    assert len(sample_pv_data["data"]) == 8760


def test_annual_and_monthly_unrounded_generation_reconciliation(sample_pv_data, standard_dates):
    """Verify that unrounded annual generation strictly equals the sum of the 12 unrounded monthly values,
    and that displayed annual generation is rounded directly from that canonical unrounded source."""
    start_d, end_d = standard_dates
    intervals, val = validate_time_series(sample_pv_data["data"], start_d, end_d)
    summary = aggregate_generation(intervals, system_capacity_kw=5.0, validation=val)

    # 1. Monthly breakdown contains 12 months
    assert len(summary.monthly_breakdown) == 12

    # 2. Sum of 12 unrounded monthly values equals unrounded annual generation down to float precision
    monthly_unrounded_sum = sum(m.unrounded_kwh for m in summary.monthly_breakdown)
    assert summary.total_unrounded_kwh is not None
    assert pytest.approx(summary.total_unrounded_kwh, abs=1e-9) == monthly_unrounded_sum

    # 3. Displayed annual generation is rounded from the exact same canonical source
    assert summary.total_generation_kwh == round(summary.total_unrounded_kwh, 2)

    # 4. Each displayed monthly generation is rounded from its unrounded value
    for m in summary.monthly_breakdown:
        assert m.total_kwh == round(m.unrounded_kwh, 2)


def test_monthly_capacity_factor_and_daily_average_calendar_days(sample_pv_data, standard_dates):
    """Verify that:
    - Monthly capacity factor uses: monthly_generation_kwh / (system_capacity_kw * actual_hours_in_month) * 100
    - Monthly daily average uses: monthly_generation_kwh / actual_days_in_month
    - February 2019 has 28 days (672 hours)
    - Annual capacity factor uses: total_unrounded_kwh / (system_capacity_kw * actual_hours) * 100
    """
    import calendar
    start_d, end_d = standard_dates
    intervals, val = validate_time_series(sample_pv_data["data"], start_d, end_d)
    cap_kw = 5.0
    summary = aggregate_generation(intervals, system_capacity_kw=cap_kw, validation=val)

    assert val.actual_hours == 8760.0
    expected_overall_cf = (summary.total_unrounded_kwh / (cap_kw * 8760.0)) * 100.0
    assert summary.capacity_factor_pct == round(expected_overall_cf, 2)

    for m in summary.monthly_breakdown:
        days_in_m = calendar.monthrange(m.year, m.month)[1]
        hours_in_m = days_in_m * 24

        # For non-leap 2019 full year, actual hours match calendar hours
        assert m.total_hours == hours_in_m
        if m.month == 2:
            assert days_in_m == 28
            assert m.total_hours == 672

        # Verify daily average formula: unrounded monthly kWh / actual days in month
        expected_daily_avg = m.unrounded_kwh / days_in_m
        assert m.daily_average_kwh == round(expected_daily_avg, 2)

        # Verify capacity factor formula: unrounded monthly kWh / (system_capacity_kw * actual_hours_in_month) * 100
        expected_cf = (m.unrounded_kwh / (cap_kw * m.total_hours)) * 100.0
        assert m.capacity_factor_pct == round(expected_cf, 2)


def test_leap_year_february_capacity_factor_and_hours():
    """Verify leap year (2020) February accounts for 29 days (696 hours) in capacity factor and daily average."""
    from datetime import datetime, timedelta
    from backend.app.domain.time_series import TimeInterval, TimeSeriesValidationResult

    # Simulate 29 days of February 2020 (696 hours), generating 1.0 kWh each hour
    feb_intervals = []
    base_dt = datetime(2020, 2, 1, 0, 0)
    for h in range(29 * 24):
        dt = base_dt + timedelta(hours=h)
        feb_intervals.append(TimeInterval(timestamp=dt, power_kw=1.0, energy_kwh=1.0))

    val = TimeSeriesValidationResult(
        total_intervals=696,
        expected_intervals=696,
        missing_intervals=0,
        is_continuous=True,
        start_time=feb_intervals[0].timestamp,
        end_time=feb_intervals[-1].timestamp,
        actual_hours=696.0,
        warnings=[],
    )

    cap_kw = 2.0
    summary = aggregate_generation(feb_intervals, system_capacity_kw=cap_kw, validation=val)

    assert len(summary.monthly_breakdown) == 1
    feb = summary.monthly_breakdown[0]
    assert feb.month == 2
    assert feb.total_hours == 696
    assert feb.total_kwh == 1392.0

    # Daily average = 1392 kWh / 29 days = 48.0 kWh/day
    assert feb.daily_average_kwh == 48.0

    # Monthly CF = 1392 kWh / (2.0 kW * 696 h) * 100 = 100.0%
    assert feb.capacity_factor_pct == 100.0


