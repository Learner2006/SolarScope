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


def test_partial_year_financial_normalization():
    """Verify that a partial period (e.g. 1 month, 744 hours) normalizes to an annual equivalent."""
    # 500 kWh produced over 744 hours (1 month)
    # Annualization factor = 8760 / 744 = 11.7742
    # Annualized generation = 500 * (8760 / 744) = ~5,887.1 kWh
    res = calculate_financials(
        total_generation_kwh=500.0,
        installation_cost=7500.0,
        import_tariff=0.20,
        export_tariff=0.05,
        self_consumption_ratio=0.70,
        annual_maintenance_cost=75.0,
        project_lifetime_years=25,
        period_hours=744.0,
    )
    expected_annual_kwh = 500.0 * (8760.0 / 744.0)
    assert pytest.approx(res.total_generation_kwh, rel=1e-2) == expected_annual_kwh
    assert any("normalized using an annualization factor" in w for w in res.warnings)


def test_editable_project_lifetime():
    """Verify financial metrics adjust dynamically when user selects 15, 20, or 30-year lifetime."""
    res_15yr = calculate_financials(
        total_generation_kwh=5000.0,
        installation_cost=6000.0,
        import_tariff=0.25,
        export_tariff=0.05,
        self_consumption_ratio=0.60,
        annual_maintenance_cost=50.0,
        project_lifetime_years=15,
        period_hours=8760.0,
    )
    res_30yr = calculate_financials(
        total_generation_kwh=5000.0,
        installation_cost=6000.0,
        import_tariff=0.25,
        export_tariff=0.05,
        self_consumption_ratio=0.60,
        annual_maintenance_cost=50.0,
        project_lifetime_years=30,
        period_hours=8760.0,
    )

    # 15-year timeline has 16 points (year 0 to 15), 30-year timeline has 31 points
    assert len(res_15yr.cash_flow_timeline) == 16
    assert len(res_30yr.cash_flow_timeline) == 31
    assert res_15yr.lifetime_total_generation_kwh == 5000.0 * 15
    assert res_30yr.lifetime_total_generation_kwh == 5000.0 * 30
    assert res_30yr.lifetime_operating_costs == 50.0 * 30
    assert res_15yr.lifetime_operating_costs == 50.0 * 15


def test_invalid_financial_inputs_raise_errors():
    """Verify rejection of invalid inputs without silent clamping."""
    with pytest.raises(ValueError, match="installation_cost cannot be negative"):
        calculate_financials(5000.0, -100.0, 0.20, 0.05, 0.5)

    with pytest.raises(ValueError, match="import_tariff cannot be negative"):
        calculate_financials(5000.0, 5000.0, -0.10, 0.05, 0.5)

    with pytest.raises(ValueError, match="export_tariff cannot be negative"):
        calculate_financials(5000.0, 5000.0, 0.20, -0.05, 0.5)

    with pytest.raises(ValueError, match="self_consumption_ratio must be between 0.0 and 1.0"):
        calculate_financials(5000.0, 5000.0, 0.20, 0.05, 1.5)

    with pytest.raises(ValueError, match="project_lifetime_years must be > 0"):
        calculate_financials(5000.0, 5000.0, 0.20, 0.05, 0.5, project_lifetime_years=0)


def test_financial_currency_independence_and_non_conversion():
    """Verify that changing financial currency code preserves numeric values and does not alter generation."""
    # Run identical inputs under USD and INR
    res_usd = calculate_financials(
        total_generation_kwh=7500.0,
        installation_cost=7500.0,
        import_tariff=0.28,
        export_tariff=0.06,
        self_consumption_ratio=0.65,
        annual_maintenance_cost=75.0,
        project_lifetime_years=25,
        currency_code="USD",
    )
    res_inr = calculate_financials(
        total_generation_kwh=7500.0,
        installation_cost=7500.0,
        import_tariff=0.28,
        export_tariff=0.06,
        self_consumption_ratio=0.65,
        annual_maintenance_cost=75.0,
        project_lifetime_years=25,
        currency_code="INR",
    )

    # 1. Currency code reflects input
    assert res_usd.currency_code == "USD"
    assert res_inr.currency_code == "INR"

    # 2. No invented exchange rate conversion: numeric financial outputs are strictly identical
    assert res_usd.installation_cost == res_inr.installation_cost == 7500.0
    assert res_usd.gross_annual_savings == res_inr.gross_annual_savings
    assert res_usd.net_annual_benefit == res_inr.net_annual_benefit
    assert res_usd.simple_payback_years == res_inr.simple_payback_years
    assert res_usd.lifetime_net_cash_flow == res_inr.lifetime_net_cash_flow
    assert res_usd.lcoe_per_kwh == res_inr.lcoe_per_kwh

    # 3. High localized tariff in INR is accepted and calculated accurately
    res_inr_localized = calculate_financials(
        total_generation_kwh=7500.0,
        installation_cost=250000.0,
        import_tariff=8.50,
        export_tariff=3.00,
        self_consumption_ratio=0.70,
        annual_maintenance_cost=2500.0,
        currency_code="INR",
    )
    # 7500 * 0.70 = 5250 kWh * 8.50 = 44,625
    # 7500 * 0.30 = 2250 kWh * 3.00 = 6,750
    # Gross = 44,625 + 6,750 = 51,375
    # Net = 51,375 - 2,500 = 48,875
    assert res_inr_localized.gross_annual_savings == 51375.0
    assert res_inr_localized.net_annual_benefit == 48875.0
    # Simple payback = 250,000 / 48,875 = 5.115... -> 5.12 years
    assert res_inr_localized.simple_payback_years == 5.12


def test_lcoe_and_dashboard_financial_reconciliation():
    """Verify LCOE and full dashboard financial metrics against independent formulas.

    Assumptions from Delhi benchmark scope:
      - Initial capex: $7,500
      - Annual O&M: $75
      - Lifetime: 25 years
      - Annual generation: 5,548 kWh
      - Import tariff: $0.28 /kWh
      - Export tariff: $0.06 /kWh
      - Self-consumption: 65% (0.65)

    Independent Formula Verification:
      - Lifetime expenditure = capex + (O&M * 25) = 7,500 + 1,875 = $9,375.00
      - Modeled generation = 5,547.734 kWh (displays as 5,548 kWh when rounded)
      - Lifetime generation = 5,547.734 * 25 = 138,693.35 kWh
      - Expected LCOE = 9,375 / 138,693.35 = 0.067595... -> round(4) = 0.0676 ($0.068/kWh formatted)
      - Self-consumed kWh = round(5,547.734 * 0.65, 2) = 3,606.03 kWh
      - Exported kWh = round(5,547.734 * 0.35, 2) = 1,941.71 kWh
      - Avoided import savings = round(3,606.03 * 0.28, 2) = $1,009.69
      - Export revenue = round(1,941.71 * 0.06, 2) = $116.50
      - Gross annual savings = 1009.69 + 116.50 = $1,126.19
      - Net annual benefit = $1,126.19 - $75.00 = $1,051.19
      - Simple payback = 7,500 / 1,051.19 = 7.13476... -> 7.13 years
      - 25-year net profit = (1,051.19 * 25) - 7,500 = $18,779.75
      - Undiscounted ROI = (18,779.75 / 7,500) * 100 = 250.3966... -> 250.4%
    """
    res = calculate_financials(
        total_generation_kwh=5547.734,
        installation_cost=7500.0,
        import_tariff=0.28,
        export_tariff=0.06,
        self_consumption_ratio=0.65,
        annual_maintenance_cost=75.0,
        project_lifetime_years=25,
        period_hours=8760.0,
    )

    assert res.gross_annual_savings == 1126.19
    assert res.annual_maintenance_cost == 75.0
    assert res.net_annual_benefit == 1051.19
    assert res.installation_cost == 7500.0
    assert res.simple_payback_years == 7.13
    assert res.lifetime_net_cash_flow == 18779.75
    assert res.roi_percentage == 250.4
    assert res.lcoe_per_kwh == 0.0676
    assert f"{res.lcoe_per_kwh:.3f}" == "0.068"

    # Also verify with 5,548.0 kWh directly: LCOE remains identically $0.068/kWh
    res_rounded = calculate_financials(
        total_generation_kwh=5548.0,
        installation_cost=7500.0,
        import_tariff=0.28,
        export_tariff=0.06,
        self_consumption_ratio=0.65,
        annual_maintenance_cost=75.0,
        project_lifetime_years=25,
        period_hours=8760.0,
    )
    assert res_rounded.lcoe_per_kwh == 0.0676
    assert f"{res_rounded.lcoe_per_kwh:.3f}" == "0.068"
    assert res_rounded.simple_payback_years == 7.13




