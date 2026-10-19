"""Tests for financial formulas, bill savings, feed-in tariffs, payback, and lifetime cash flows."""

import pytest
from backend.app.domain.financials import calculate_financials


def test_financial_calculations_independent_verification():
    """Verify financial formulas against hand-calculated expected values.

    Given:
      - 5,000 kWh annual generation
      - 60% self-consumption => 3,000 kWh self-consumed, 2,000 kWh exported
      - Import tariff $0.25/kWh => Avoided import = 3000 * 0.25 = $750.00
      - Export tariff $0.05/kWh => Export revenue = 2000 * 0.05 = $100.00
      - Gross annual savings = 750 + 100 = $850.00
      - Annual maintenance = $50.00
      - Net annual benefit = 850 - 50 = $800.00
      - Installation cost = $6,400.00
      - Simple payback = 6400 / 800 = 8.00 years
      - Lifetime (25 yrs) net cash flow = (800 * 25) - 6400 = $13,600.00
      - ROI = (13,600 / 6,400) * 100 = 212.5%
    """
    res = calculate_financials(
        total_generation_kwh=5000.0,
        installation_cost=6400.0,
        import_tariff=0.25,
        export_tariff=0.05,
        self_consumption_ratio=0.60,
        annual_maintenance_cost=50.0,
        project_lifetime_years=25,
        period_hours=8760.0,
    )

    assert res.self_consumed_kwh == 3000.0
    assert res.exported_kwh == 2000.0
    assert res.avoided_import_savings == 750.0
    assert res.export_revenue == 100.0
    assert res.gross_annual_savings == 850.0
    assert res.net_annual_benefit == 800.0
    assert res.simple_payback_years == 8.0
    assert res.is_payback_achievable is True
    assert res.lifetime_net_cash_flow == 13600.0
    assert res.roi_percentage == 212.5
    assert len(res.cash_flow_timeline) == 26  # Year 0 through 25
    assert res.cash_flow_timeline[0].cumulative_cash_flow == -6400.0
    assert res.cash_flow_timeline[25].cumulative_cash_flow == 13600.0


def test_zero_installation_cost():
    """Verify immediate payback when capital cost is zero (e.g. financed/grant)."""
    res = calculate_financials(
        total_generation_kwh=4000.0,
        installation_cost=0.0,
        import_tariff=0.20,
        export_tariff=0.05,
        self_consumption_ratio=0.70,
        annual_maintenance_cost=0.0,
        project_lifetime_years=25,
    )
    assert res.simple_payback_years == 0.0
    assert res.is_payback_achievable is True
    assert "Immediate" in res.payback_status


def test_negative_net_benefit_does_not_divide_by_zero():
    """Verify that when maintenance cost exceeds solar savings, payback is gracefully None."""
    res = calculate_financials(
        total_generation_kwh=1000.0,
        installation_cost=5000.0,
        import_tariff=0.10,
        export_tariff=0.0,
        self_consumption_ratio=0.50,
        annual_maintenance_cost=200.0,  # 500 kWh * 0.10 = $50 gross savings < $200 maintenance
        project_lifetime_years=25,
    )
    # Net annual benefit = 50 - 200 = -150.0
    assert res.net_annual_benefit == -150.0
    assert res.simple_payback_years is None
    assert res.is_payback_achievable is False
    assert "Non-recovering" in res.payback_status
    assert any("zero or negative net annual cash flow" in w for w in res.warnings)


def test_payback_exceeds_project_lifetime():
    """Verify that when payback exceeds system operational life, it is marked as unachievable."""
    res = calculate_financials(
        total_generation_kwh=2000.0,
        installation_cost=20000.0,  # High cost
        import_tariff=0.15,
        export_tariff=0.0,
        self_consumption_ratio=1.0,
        annual_maintenance_cost=50.0,  # Net savings = 2000*0.15 - 50 = $250/yr
        project_lifetime_years=25,     # Payback = 20000 / 250 = 80 years
    )
    assert res.simple_payback_years == 80.0
    assert res.is_payback_achievable is False
    assert "Exceeds lifetime" in res.payback_status
