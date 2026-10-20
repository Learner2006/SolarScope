"""Tests for scenario sensitivity engine, delta calculations, baseline immutability, parameter isolation, and formula reproducibility."""

import pytest
from backend.app.domain.financials import calculate_financials
from backend.app.domain.generation import aggregate_generation
from backend.app.domain.scenarios import (
    ScenarioParameters,
    evaluate_scenario,
)
from backend.app.domain.time_series import validate_time_series


def test_scenario_baseline_immutability(sample_pv_data, standard_dates):
    """Verify that evaluating a scenario does not mutate any values in the baseline objects."""
    start_d, end_d = standard_dates
    intervals, val = validate_time_series(sample_pv_data["data"], start_d, end_d)

    baseline_gen = aggregate_generation(intervals, system_capacity_kw=4.0, validation=val)
    baseline_fin = calculate_financials(
        total_generation_kwh=baseline_gen.total_generation_kwh,
        installation_cost=7000.0,
        import_tariff=0.28,
        export_tariff=0.06,
        self_consumption_ratio=0.65,
        annual_maintenance_cost=75.0,
        project_lifetime_years=25,
    )

    # Snapshot baseline attributes
    orig_total_kwh = baseline_gen.total_generation_kwh
    orig_gross_savings = baseline_fin.gross_annual_savings
    orig_payback = baseline_fin.simple_payback_years

    # Run scenario with -20% generation and higher installation cost
    scenario_params = ScenarioParameters(
        scenario_id="shading_and_cost_increase",
        scenario_name="Shading & Cost Increase",
        description="Reduced generation by 20% and installation cost +$1,500",
        generation_multiplier=0.80,
        installation_cost_override=8500.0,
    )

    comparison = evaluate_scenario(baseline_gen, baseline_fin, scenario_params)

    # Assert baseline was NOT modified
    assert baseline_gen.total_generation_kwh == orig_total_kwh
    assert baseline_fin.gross_annual_savings == orig_gross_savings
    assert baseline_fin.simple_payback_years == orig_payback

    # Assert scenario reflects the changes
    assert comparison.scenario_financials.installation_cost == 8500.0
    assert pytest.approx(comparison.delta.generation_diff_pct, rel=1e-2) == -20.0
    assert comparison.delta.generation_diff_kwh < 0
    assert comparison.delta.gross_savings_diff_usd < 0
    assert comparison.delta.payback_diff_years > 0  # Takes longer to pay back


def test_scenario_independent_generation_change(sample_pv_data, standard_dates):
    """Verify that adjusting generation alone does not alter capex, tariffs, or self-consumption ratios."""
    start_d, end_d = standard_dates
    intervals, val = validate_time_series(sample_pv_data["data"], start_d, end_d)

    baseline_gen = aggregate_generation(intervals, system_capacity_kw=5.0, validation=val)
    baseline_fin = calculate_financials(
        total_generation_kwh=baseline_gen.total_generation_kwh,
        installation_cost=7500.0,
        import_tariff=0.25,
        export_tariff=0.05,
        self_consumption_ratio=0.60,
        annual_maintenance_cost=100.0,
        project_lifetime_years=25,
    )

    # Only adjust generation by -15%
    scenario_params = ScenarioParameters(
        scenario_id="shading_only",
        scenario_name="Shading Only (-15%)",
        description="Reduced solar output by 15%",
        generation_multiplier=0.85,
    )

    comparison = evaluate_scenario(baseline_gen, baseline_fin, scenario_params)
    scen_fin = comparison.scenario_financials

    # Unmodified baseline invariants:
    assert scen_fin.installation_cost == baseline_fin.installation_cost
    assert scen_fin.import_tariff == baseline_fin.import_tariff
    assert scen_fin.export_tariff == baseline_fin.export_tariff
    assert scen_fin.self_consumption_ratio == baseline_fin.self_consumption_ratio
    assert scen_fin.annual_maintenance_cost == baseline_fin.annual_maintenance_cost
    assert scen_fin.project_lifetime_years == baseline_fin.project_lifetime_years

    # Generation adjusted exactly by -15%
    expected_gen = round(baseline_fin.total_generation_kwh * 0.85, 2)
    assert scen_fin.total_generation_kwh == expected_gen
    assert comparison.delta.generation_diff_pct == -15.0

    # Avoided savings and export revenue both decrease by exactly 15%
    assert pytest.approx(scen_fin.avoided_import_savings, rel=1e-2) == round(baseline_fin.avoided_import_savings * 0.85, 2)
    assert pytest.approx(scen_fin.export_revenue, rel=1e-2) == round(baseline_fin.export_revenue * 0.85, 2)
    assert comparison.delta.gross_savings_diff_usd < 0
    assert comparison.delta.payback_diff_years > 0


def test_scenario_independent_tariff_change(sample_pv_data, standard_dates):
    """Verify that adjusting import tariff alone does not alter generation, installation cost, or export revenue."""
    start_d, end_d = standard_dates
    intervals, val = validate_time_series(sample_pv_data["data"], start_d, end_d)

    baseline_gen = aggregate_generation(intervals, system_capacity_kw=5.0, validation=val)
    baseline_fin = calculate_financials(
        total_generation_kwh=baseline_gen.total_generation_kwh,
        installation_cost=8000.0,
        import_tariff=0.20,
        export_tariff=0.04,
        self_consumption_ratio=0.70,
        annual_maintenance_cost=100.0,
        project_lifetime_years=25,
    )

    scenario_params = ScenarioParameters(
        scenario_id="grid_tariff_hike",
        scenario_name="Grid Tariff Hike (+25%)",
        description="Retail import tariff rises from $0.20 to $0.25/kWh",
        import_tariff_override=0.25,
    )

    comparison = evaluate_scenario(baseline_gen, baseline_fin, scenario_params)
    scen_fin = comparison.scenario_financials

    # Invariants
    assert scen_fin.total_generation_kwh == baseline_fin.total_generation_kwh
    assert scen_fin.installation_cost == baseline_fin.installation_cost
    assert scen_fin.export_tariff == baseline_fin.export_tariff
    assert scen_fin.self_consumption_ratio == baseline_fin.self_consumption_ratio
    assert scen_fin.annual_maintenance_cost == baseline_fin.annual_maintenance_cost
    assert scen_fin.export_revenue == baseline_fin.export_revenue  # Export compensation untouched

    # Deltas
    assert comparison.delta.generation_diff_kwh == 0.0
    assert comparison.delta.generation_diff_pct == 0.0
    assert comparison.delta.gross_savings_diff_usd > 0
    assert comparison.delta.net_annual_benefit_diff_usd > 0
    assert comparison.delta.payback_diff_years < 0  # Payback is faster (negative delta)
    assert scen_fin.lifetime_net_cash_flow > baseline_fin.lifetime_net_cash_flow


def test_scenario_independent_cost_change(sample_pv_data, standard_dates):
    """Verify that adjusting installation capex alone does not alter generation, tariffs, or annual savings."""
    start_d, end_d = standard_dates
    intervals, val = validate_time_series(sample_pv_data["data"], start_d, end_d)

    baseline_gen = aggregate_generation(intervals, system_capacity_kw=5.0, validation=val)
    baseline_fin = calculate_financials(
        total_generation_kwh=baseline_gen.total_generation_kwh,
        installation_cost=7500.0,
        import_tariff=0.25,
        export_tariff=0.05,
        self_consumption_ratio=0.60,
        annual_maintenance_cost=100.0,
        project_lifetime_years=25,
    )

    scenario_params = ScenarioParameters(
        scenario_id="cost_overrun",
        scenario_name="Cost Overrun (+$2,000)",
        description="Installation cost rises from $7,500 to $9,500",
        installation_cost_override=9500.0,
    )

    comparison = evaluate_scenario(baseline_gen, baseline_fin, scenario_params)
    scen_fin = comparison.scenario_financials

    # Invariants: Generation and annual bill savings remain completely unchanged
    assert scen_fin.total_generation_kwh == baseline_fin.total_generation_kwh
    assert scen_fin.import_tariff == baseline_fin.import_tariff
    assert scen_fin.export_tariff == baseline_fin.export_tariff
    assert scen_fin.self_consumption_ratio == baseline_fin.self_consumption_ratio
    assert scen_fin.annual_maintenance_cost == baseline_fin.annual_maintenance_cost
    assert scen_fin.avoided_import_savings == baseline_fin.avoided_import_savings
    assert scen_fin.export_revenue == baseline_fin.export_revenue
    assert scen_fin.gross_annual_savings == baseline_fin.gross_annual_savings
    assert scen_fin.net_annual_benefit == baseline_fin.net_annual_benefit

    # Deltas
    assert comparison.delta.generation_diff_kwh == 0.0
    assert comparison.delta.generation_diff_pct == 0.0
    assert comparison.delta.gross_savings_diff_usd == 0.0
    assert comparison.delta.net_annual_benefit_diff_usd == 0.0

    # Only capital-dependent outcomes change:
    assert scen_fin.installation_cost == 9500.0
    assert comparison.delta.payback_diff_years > 0  # Longer payback
    assert scen_fin.lifetime_net_cash_flow == round(baseline_fin.lifetime_net_cash_flow - 2000.0, 2)
    assert comparison.delta.lifetime_cash_flow_diff_usd == -2000.0
    assert scen_fin.lcoe_per_kwh > baseline_fin.lcoe_per_kwh


def test_scenario_custom_multi_parameter_formula_reproducibility():
    """Verify that a custom multi-parameter scenario is 100% reproducible from the documented mathematical formulas."""
    # Baseline setup: 6000 kWh, capex $8000, import tariff $0.24, export tariff $0.06, self-consumption 70%, O&M $80, 25 yrs
    baseline_gen_kwh = 6000.0
    baseline_fin = calculate_financials(
        total_generation_kwh=baseline_gen_kwh,
        installation_cost=8000.0,
        import_tariff=0.24,
        export_tariff=0.06,
        self_consumption_ratio=0.70,
        annual_maintenance_cost=80.0,
        project_lifetime_years=25,
        currency_code="USD",
    )

    # Mock baseline generation summary
    class MockGenSummary:
        total_generation_kwh = baseline_gen_kwh
        period_hours = 8760.0

    mock_gen = MockGenSummary()

    # Custom adjustments:
    # -12% generation (multiplier = 0.88)
    # capex $9,200 (+$1,200)
    # import tariff $0.30/kWh (+$0.06/kWh)
    scenario_params = ScenarioParameters(
        scenario_id="custom_audit_test",
        scenario_name="Custom Multi-Parameter Scenario",
        description="Adjusted generation, capex, and import tariff",
        generation_multiplier=0.88,
        installation_cost_override=9200.0,
        import_tariff_override=0.30,
    )

    comparison = evaluate_scenario(mock_gen, baseline_fin, scenario_params)
    scen = comparison.scenario_financials
    delta = comparison.delta

    # Manual Step-by-Step Mathematical Derivations:
    # 1. Total Generation: 6000 * 0.88 = 5280.0 kWh
    expected_gen = 5280.0
    assert scen.total_generation_kwh == expected_gen

    # 2. Self-Consumed Energy: 5280 * 0.70 = 3696.0 kWh
    expected_self = 3696.0
    assert scen.self_consumed_kwh == expected_self

    # 3. Exported Energy: 5280 * 0.30 = 1584.0 kWh
    expected_export = 1584.0
    assert scen.exported_kwh == expected_export

    # 4. Avoided Import Savings: 3696 * 0.30 = 1108.80
    expected_avoided = 1108.80
    assert scen.avoided_import_savings == expected_avoided

    # 5. Export Revenue: 1584 * 0.06 = 95.04
    expected_export_rev = 95.04
    assert scen.export_revenue == expected_export_rev

    # 6. Gross Annual Savings: 1108.80 + 95.04 = 1203.84
    expected_gross = 1203.84
    assert scen.gross_annual_savings == expected_gross

    # 7. Net Annual Benefit: 1203.84 - 80.00 = 1123.84
    expected_net = 1123.84
    assert scen.net_annual_benefit == expected_net

    # 8. Simple Payback: 9200 / 1123.84 = 8.1862... -> 8.19 years
    expected_payback = round(9200.0 / 1123.84, 2)
    assert scen.simple_payback_years == expected_payback

    # 9. Lifetime Generation: 5280 * 25 = 132000.0 kWh
    expected_lifetime_gen = 132000.0
    assert scen.lifetime_total_generation_kwh == expected_lifetime_gen

    # 10. Lifetime Gross Savings: 1203.84 * 25 = 30096.00
    expected_lifetime_gross = 30096.00
    assert scen.lifetime_gross_savings == expected_lifetime_gross

    # 11. Lifetime Operating Costs: 80 * 25 = 2000.00
    expected_lifetime_om = 2000.00
    assert scen.lifetime_operating_costs == expected_lifetime_om

    # 12. Lifetime Net Cash Flow: 30096 - 2000 - 9200 = 18896.00
    expected_lifetime_net = 18896.00
    assert scen.lifetime_net_cash_flow == expected_lifetime_net

    # 13. ROI Percentage: (18896 / 9200) * 100 = 205.39... -> 205.4%
    expected_roi = round((18896.0 / 9200.0) * 100.0, 1)
    assert scen.roi_percentage == expected_roi

    # 14. LCOE: (9200 + 2000) / 132000 = 11200 / 132000 = 0.084848... -> 0.0848
    expected_lcoe = round((9200.0 + 2000.0) / 132000.0, 4)
    assert scen.lcoe_per_kwh == expected_lcoe

    # 15. Deltas Reproducibility:
    assert delta.generation_diff_kwh == round(expected_gen - 6000.0, 2)
    assert delta.generation_diff_pct == -12.0
    assert delta.gross_savings_diff_usd == round(expected_gross - baseline_fin.gross_annual_savings, 2)
    assert delta.net_annual_benefit_diff_usd == round(expected_net - baseline_fin.net_annual_benefit, 2)
    assert delta.payback_diff_years == round(expected_payback - baseline_fin.simple_payback_years, 2)
    assert delta.lifetime_cash_flow_diff_usd == round(expected_lifetime_net - baseline_fin.lifetime_net_cash_flow, 2)


def test_scenario_multi_currency_summary_message():
    """Verify that delta summary message uses the active currency symbol (e.g. ₹ for INR, € for EUR) without hardcoded $."""
    class MockGen:
        total_generation_kwh = 5000.0
        period_hours = 8760.0

    inr_fin = calculate_financials(
        total_generation_kwh=5000.0,
        installation_cost=250000.0,
        import_tariff=8.5,
        export_tariff=3.0,
        self_consumption_ratio=0.70,
        annual_maintenance_cost=3000.0,
        project_lifetime_years=25,
        currency_code="INR",
    )

    params = ScenarioParameters(
        scenario_id="inr_cost_hike",
        scenario_name="Capex Increase INR",
        description="Increased capex in rupees",
        installation_cost_override=300000.0,
        import_tariff_override=9.5,
    )

    comparison = evaluate_scenario(MockGen(), inr_fin, params)

    msg = comparison.delta.summary_message
    assert "₹" in msg, f"Summary message must contain '₹', got: {msg}"
    assert "$" not in msg, f"Summary message must NOT contain '$' when currency is INR, got: {msg}"
    assert "cost +₹50000" in msg
    assert "import tariff ₹9.500/kWh" in msg
