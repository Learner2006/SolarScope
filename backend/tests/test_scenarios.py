"""Tests for scenario sensitivity engine, delta calculations, and baseline immutability."""

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

    # Assert scenario reflect the changes
    assert comparison.scenario_financials.installation_cost == 8500.0
    assert pytest.approx(comparison.delta.generation_diff_pct, rel=1e-2) == -20.0
    assert comparison.delta.generation_diff_kwh < 0
    assert comparison.delta.gross_savings_diff_usd < 0
    assert comparison.delta.payback_diff_years > 0  # Takes longer to pay back


def test_scenario_tariff_escalation(sample_pv_data, standard_dates):
    """Verify tariff escalation scenario: higher grid electricity price increases savings and accelerates payback."""
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

    assert comparison.delta.gross_savings_diff_usd > 0
    assert comparison.delta.net_annual_benefit_diff_usd > 0
    assert comparison.delta.payback_diff_years < 0  # Payback is faster (negative delta)
    assert comparison.scenario_financials.lifetime_net_cash_flow > baseline_fin.lifetime_net_cash_flow
