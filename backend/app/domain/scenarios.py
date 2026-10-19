"""Scenario sensitivity engine: baseline isolation, preset sensitivities, and delta calculations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional
from backend.app.domain.financials import FinancialAnalysisResult, calculate_financials
from backend.app.domain.generation import GenerationSummary


@dataclass(frozen=True)
class ScenarioParameters:
    """User-selected or preset parameters for sensitivity analysis."""
    scenario_id: str
    scenario_name: str
    description: str
    # Modifiers
    generation_multiplier: float = 1.0  # e.g. 0.90 for -10% generation
    installation_cost_override: Optional[float] = None
    import_tariff_override: Optional[float] = None
    export_tariff_override: Optional[float] = None
    self_consumption_override: Optional[float] = None


@dataclass(frozen=True)
class ScenarioDelta:
    """Absolute and percentage differences between baseline and scenario."""
    generation_diff_kwh: float
    generation_diff_pct: float
    gross_savings_diff_usd: float
    gross_savings_diff_pct: float
    net_annual_benefit_diff_usd: float
    payback_diff_years: Optional[float]  # positive means payback took longer
    lifetime_cash_flow_diff_usd: float
    lifetime_cash_flow_diff_pct: float
    summary_message: str


@dataclass(frozen=True)
class ScenarioComparisonResult:
    """Complete container preserving baseline and presenting scenario outcome."""
    scenario_id: str
    scenario_name: str
    description: str
    parameters: ScenarioParameters
    baseline_generation: GenerationSummary
    baseline_financials: FinancialAnalysisResult
    scenario_financials: FinancialAnalysisResult
    delta: ScenarioDelta
    warnings: List[str]


def evaluate_scenario(
    baseline_generation: GenerationSummary,
    baseline_financials: FinancialAnalysisResult,
    parameters: ScenarioParameters,
) -> ScenarioComparisonResult:
    """Evaluate a sensitivity scenario against a baseline without mutating baseline values.

    Parameters
    ----------
    baseline_generation : GenerationSummary
        The original, unmutated generation summary.
    baseline_financials : FinancialAnalysisResult
        The original, unmutated financial analysis result.
    parameters : ScenarioParameters
        The sensitivity adjustments to apply.

    Returns
    -------
    ScenarioComparisonResult
        Scenario outcomes and delta comparison against baseline.
    """
    warnings: List[str] = []

    # Calculate adjusted generation
    adj_generation_kwh = baseline_generation.total_generation_kwh * parameters.generation_multiplier

    # Cost
    adj_cost = (
        parameters.installation_cost_override
        if parameters.installation_cost_override is not None
        else baseline_financials.installation_cost
    )

    # Tariffs
    adj_import_tariff = (
        parameters.import_tariff_override
        if parameters.import_tariff_override is not None
        else baseline_financials.import_tariff
    )
    adj_export_tariff = (
        parameters.export_tariff_override
        if parameters.export_tariff_override is not None
        else baseline_financials.export_tariff
    )

    # Self-consumption
    adj_self_consumption = (
        parameters.self_consumption_override
        if parameters.self_consumption_override is not None
        else baseline_financials.self_consumption_ratio
    )

    # Re-evaluate financials with modified parameters
    scenario_financials = calculate_financials(
        total_generation_kwh=adj_generation_kwh,
        installation_cost=adj_cost,
        import_tariff=adj_import_tariff,
        export_tariff=adj_export_tariff,
        self_consumption_ratio=adj_self_consumption,
        annual_maintenance_cost=baseline_financials.annual_maintenance_cost,
        project_lifetime_years=baseline_financials.project_lifetime_years,
        period_hours=baseline_generation.period_hours,
    )

    # Calculate deltas
    gen_diff_kwh = round(adj_generation_kwh - baseline_generation.total_generation_kwh, 2)
    gen_diff_pct = (
        round((gen_diff_kwh / baseline_generation.total_generation_kwh) * 100.0, 1)
        if baseline_generation.total_generation_kwh > 0
        else 0.0
    )

    savings_diff_usd = round(
        scenario_financials.gross_annual_savings - baseline_financials.gross_annual_savings, 2
    )
    savings_diff_pct = (
        round((savings_diff_usd / baseline_financials.gross_annual_savings) * 100.0, 1)
        if baseline_financials.gross_annual_savings > 0
        else 0.0
    )

    net_diff_usd = round(
        scenario_financials.net_annual_benefit - baseline_financials.net_annual_benefit, 2
    )

    payback_diff_years: Optional[float] = None
    if (
        scenario_financials.simple_payback_years is not None
        and baseline_financials.simple_payback_years is not None
    ):
        payback_diff_years = round(
            scenario_financials.simple_payback_years - baseline_financials.simple_payback_years, 2
        )

    lifetime_diff_usd = round(
        scenario_financials.lifetime_net_cash_flow - baseline_financials.lifetime_net_cash_flow, 2
    )
    lifetime_diff_pct = (
        round((lifetime_diff_usd / abs(baseline_financials.lifetime_net_cash_flow)) * 100.0, 1)
        if baseline_financials.lifetime_net_cash_flow != 0
        else 0.0
    )

    # Human-readable summary
    summary_parts = []
    if gen_diff_pct != 0:
        summary_parts.append(f"generation {'+' if gen_diff_pct > 0 else ''}{gen_diff_pct}%")
    if adj_cost != baseline_financials.installation_cost:
        cost_diff = adj_cost - baseline_financials.installation_cost
        summary_parts.append(f"cost {'+$' if cost_diff > 0 else '-$'}{abs(cost_diff):.0f}")
    if adj_import_tariff != baseline_financials.import_tariff:
        summary_parts.append(f"import tariff ${adj_import_tariff:.3f}/kWh")

    changes_str = ", ".join(summary_parts) if summary_parts else "specified parameter adjustments"

    if payback_diff_years is not None:
        if payback_diff_years > 0:
            payback_msg = f"extends payback by {payback_diff_years:+.1f} years"
        elif payback_diff_years < 0:
            payback_msg = f"shortens payback by {abs(payback_diff_years):.1f} years"
        else:
            payback_msg = "leaves payback unchanged"
    else:
        payback_msg = f"payback status: {scenario_financials.payback_status}"

    summary_message = (
        f"Under {changes_str}, net annual savings change by ${net_diff_usd:+.2f}/yr, which {payback_msg}."
    )

    delta = ScenarioDelta(
        generation_diff_kwh=gen_diff_kwh,
        generation_diff_pct=gen_diff_pct,
        gross_savings_diff_usd=savings_diff_usd,
        gross_savings_diff_pct=savings_diff_pct,
        net_annual_benefit_diff_usd=net_diff_usd,
        payback_diff_years=payback_diff_years,
        lifetime_cash_flow_diff_usd=lifetime_diff_usd,
        lifetime_cash_flow_diff_pct=lifetime_diff_pct,
        summary_message=summary_message,
    )

    return ScenarioComparisonResult(
        scenario_id=parameters.scenario_id,
        scenario_name=parameters.scenario_name,
        description=parameters.description,
        parameters=parameters,
        baseline_generation=baseline_generation,
        baseline_financials=baseline_financials,
        scenario_financials=scenario_financials,
        delta=delta,
        warnings=warnings,
    )
