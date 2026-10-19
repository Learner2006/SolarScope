"""Tests for calculation edge cases, input anomalies, and boundary conditions."""

from datetime import date
import pytest
from backend.app.domain.financials import calculate_financials
from backend.app.domain.generation import aggregate_generation
from backend.app.domain.time_series import (
    calculate_expected_hours,
    validate_time_series,
)


def test_invalid_date_order_raises():
    """Verify ValueError when end_date precedes start_date."""
    with pytest.raises(ValueError, match="cannot be earlier"):
        calculate_expected_hours(date(2023, 12, 31), date(2023, 1, 1))


def test_empty_raw_data_handling():
    """Verify empty dictionary returns zero metrics with appropriate warnings instead of crashing."""
    intervals, val = validate_time_series({}, date(2023, 1, 1), date(2023, 1, 7))
    assert len(intervals) == 0
    assert val.total_intervals == 0
    assert val.missing_intervals == 7 * 24
    assert any("empty" in w.lower() for w in val.warnings)

    summary = aggregate_generation(intervals, system_capacity_kw=3.0, validation=val)
    assert summary.total_generation_kwh == 0.0
    assert summary.capacity_factor_pct == 0.0
    assert summary.monthly_breakdown == []


def test_zero_generation_period():
    """Verify all-zero generation handles division safely."""
    raw_data = {f"2023-01-01 {h:02d}:00": {"electricity": 0.0} for h in range(24)}
    intervals, val = validate_time_series(raw_data, date(2023, 1, 1), date(2023, 1, 1))
    summary = aggregate_generation(intervals, system_capacity_kw=5.0, validation=val)

    assert summary.total_generation_kwh == 0.0
    assert summary.capacity_factor_pct == 0.0

    financials = calculate_financials(
        total_generation_kwh=summary.total_generation_kwh,
        installation_cost=5000.0,
        import_tariff=0.25,
        export_tariff=0.05,
        self_consumption_ratio=0.50,
        annual_maintenance_cost=100.0,
    )
    assert financials.gross_annual_savings == 0.0
    assert financials.net_annual_benefit == -100.0
    assert financials.simple_payback_years is None
    assert financials.is_payback_achievable is False


def test_extreme_self_consumption_boundaries():
    """Verify 0% self-consumption (100% exported) and 100% self-consumption (0% exported)."""
    # 100% Exported
    res_export_only = calculate_financials(
        total_generation_kwh=1000.0,
        installation_cost=2000.0,
        import_tariff=0.30,
        export_tariff=0.10,
        self_consumption_ratio=0.0,
        annual_maintenance_cost=0.0,
    )
    assert res_export_only.self_consumed_kwh == 0.0
    assert res_export_only.exported_kwh == 1000.0
    assert res_export_only.avoided_import_savings == 0.0
    assert res_export_only.export_revenue == 100.0
    assert res_export_only.gross_annual_savings == 100.0
    assert res_export_only.simple_payback_years == 20.0

    # 100% Self-Consumed
    res_self_only = calculate_financials(
        total_generation_kwh=1000.0,
        installation_cost=2000.0,
        import_tariff=0.30,
        export_tariff=0.10,
        self_consumption_ratio=1.0,
        annual_maintenance_cost=0.0,
    )
    assert res_self_only.self_consumed_kwh == 1000.0
    assert res_self_only.exported_kwh == 0.0
    assert res_self_only.avoided_import_savings == 300.0
    assert res_self_only.export_revenue == 0.0
    assert res_self_only.gross_annual_savings == 300.0
    # Payback: 2000 / 300 = 6.67 years
    assert res_self_only.simple_payback_years == 6.67
