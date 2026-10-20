"""Financial calculation engine: bill savings, export compensation, simple payback, and lifetime cash flows."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


def get_currency_symbol(currency_code: str = "USD") -> str:
    """Return standard currency symbol for supported ISO 4217 currency codes."""
    code = (currency_code or "USD").upper()
    if code == "INR":
        return "₹"
    if code == "EUR":
        return "€"
    if code == "GBP":
        return "£"
    return "$"


@dataclass(frozen=True)
class CashFlowPoint:
    """Cumulative cash flow at a given project year."""
    year: int
    net_annual_cash_flow: float
    cumulative_cash_flow: float


@dataclass(frozen=True)
class FinancialAnalysisResult:
    """Complete, transparent financial feasibility outcomes."""
    # Inputs & Parameters
    installation_cost: float
    import_tariff: float
    export_tariff: float
    self_consumption_ratio: float
    annual_maintenance_cost: float
    project_lifetime_years: int

    # Energy allocation
    total_generation_kwh: float
    self_consumed_kwh: float
    exported_kwh: float

    # Annualized financials
    avoided_import_savings: float
    export_revenue: float
    gross_annual_savings: float
    net_annual_benefit: float

    # Payback
    simple_payback_years: Optional[float]
    is_payback_achievable: bool
    payback_status: str

    # Lifetime returns
    lifetime_total_generation_kwh: float
    lifetime_gross_savings: float
    lifetime_operating_costs: float
    lifetime_net_cash_flow: float
    roi_percentage: float
    lcoe_per_kwh: float
    currency_code: str = "USD"

    # Annual timeline for charts
    cash_flow_timeline: List[CashFlowPoint] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


def calculate_financials(
    total_generation_kwh: float,
    installation_cost: float,
    import_tariff: float,
    export_tariff: float,
    self_consumption_ratio: float,
    annual_maintenance_cost: float = 0.0,
    project_lifetime_years: int = 25,
    period_hours: float = 8760.0,
    currency_code: str = "USD",
) -> FinancialAnalysisResult:
    """Calculate transparent solar financial metrics and payback period.

    Parameters
    ----------
    total_generation_kwh : float
        Generation achieved in the analyzed period.
    installation_cost : float
        Initial turnkey installation and capital cost in specified currency.
    import_tariff : float
        Retail grid electricity price (currency/kWh) offset by self-consumed power.
    export_tariff : float
        Feed-in tariff or export compensation (currency/kWh) for grid export.
    self_consumption_ratio : float
        Fraction of solar power consumed on-site (0.0 to 1.0).
    annual_maintenance_cost : float
        Expected recurring annual operations & maintenance cost (currency/year).
    project_lifetime_years : int
        Assumed project operational life in years (typically 20-30).
    period_hours : float
        Actual duration of analyzed time-series in hours.
    currency_code : str
        ISO 4217 currency code (e.g. 'USD', 'INR', 'EUR', 'GBP').

    Returns
    -------
    FinancialAnalysisResult
        Calculated financial outcomes, timeline, and warnings.
    """
    warnings: List[str] = []

    # Validations & bounds checking
    if installation_cost < 0:
        raise ValueError(f"installation_cost cannot be negative, got {installation_cost}")
    if import_tariff < 0:
        raise ValueError(f"import_tariff cannot be negative, got {import_tariff}")
    if export_tariff < 0:
        raise ValueError(f"export_tariff cannot be negative, got {export_tariff}")
    if not (0.0 <= self_consumption_ratio <= 1.0):
        raise ValueError(f"self_consumption_ratio must be between 0.0 and 1.0, got {self_consumption_ratio}")
    if project_lifetime_years <= 0:
        raise ValueError(f"project_lifetime_years must be > 0, got {project_lifetime_years}")

    # Domain Boundary / Leap-Year Buffer:
    # We allow a +/-48 hour buffer before triggering annualization.
    # This ensures both regular years (8,760 h) and leap years (8,784 h) are treated as full annual
    # baselines without artificially scaling leap-year generation by 8760 / 8784.
    # For partial periods (<8,712 h), we normalize annual metrics while issuing an explicit caution
    # because partial seasons (e.g. June vs December) misrepresent full annual declination.
    annualization_factor = (8760.0 / period_hours) if (period_hours > 0 and abs(period_hours - 8760.0) > 48) else 1.0
    if annualization_factor != 1.0:
        warnings.append(
            f"Analyzed period represents {period_hours:.0f} hours ({period_hours / 8760.0 * 100.0:.1f}% of a standard year). "
            f"Annual financial returns are normalized using an annualization factor of {annualization_factor:.3f}. "
            "Caution: Seasonally incomplete periods do not reflect annual production due to summer/winter solar declination variations and should not be treated as a reliable annual forecast."
        )

    annual_gen_kwh = total_generation_kwh * annualization_factor

    # Energy allocation between on-site consumption and grid export
    self_consumed_kwh = round(annual_gen_kwh * self_consumption_ratio, 2)
    exported_kwh = round(annual_gen_kwh * (1.0 - self_consumption_ratio), 2)

    avoided_import_savings = round(self_consumed_kwh * import_tariff, 2)
    export_revenue = round(exported_kwh * export_tariff, 2)
    gross_annual_savings = round(avoided_import_savings + export_revenue, 2)
    net_annual_benefit = round(gross_annual_savings - annual_maintenance_cost, 2)

    # Failure Behaviour / Mathematical Robustness:
    # When recurring annual maintenance equals or exceeds gross solar savings (net_annual_benefit <= 0),
    # capital cost can never be recouped. We intentionally set simple_payback_years to None and report
    # 'Non-recovering' rather than returning negative numbers or raising division-by-zero errors.
    simple_payback_years: Optional[float] = None
    is_payback_achievable = False

    if net_annual_benefit <= 0.0:
        simple_payback_years = None
        is_payback_achievable = False
        payback_status = "Non-recovering: annual operating costs equal or exceed gross solar savings"
        warnings.append("System generates zero or negative net annual cash flow under current tariff and cost assumptions.")
    elif installation_cost == 0.0:
        simple_payback_years = 0.0
        is_payback_achievable = True
        payback_status = "Immediate (zero initial capital cost)"
    else:
        raw_payback = installation_cost / net_annual_benefit
        simple_payback_years = round(raw_payback, 2)
        if simple_payback_years > project_lifetime_years:
            is_payback_achievable = False
            payback_status = (
                f"Exceeds lifetime ({simple_payback_years:.1f} yrs vs {project_lifetime_years} yr lifetime)"
            )
            warnings.append(
                f"Simple payback of {simple_payback_years:.1f} years exceeds the assumed {project_lifetime_years}-year "
                "lifetime; capital is not recouped within the system operational life."
            )
        else:
            is_payback_achievable = True
            payback_status = f"Payback in {simple_payback_years:.1f} years"

    # Architectural Decision / Trade-off:
    # Lifetime returns, ROI, and LCOE are calculated as undiscounted nominal values under constant annual generation.
    # While omitting panel degradation (~0.5%/yr) and cost-of-capital discounting makes projections optimistic,
    # it keeps the financial baseline transparent, verifiable, and free of subjective discount rate assumptions.
    # Future Improvement:
    # Introduce an optional discounted cash-flow (NPV/IRR) mode with user-configurable discount and degradation rates.
    lifetime_total_generation_kwh = round(annual_gen_kwh * project_lifetime_years, 2)
    lifetime_gross_savings = round(gross_annual_savings * project_lifetime_years, 2)
    lifetime_operating_costs = round(annual_maintenance_cost * project_lifetime_years, 2)
    lifetime_net_cash_flow = round(lifetime_gross_savings - lifetime_operating_costs - installation_cost, 2)

    roi_percentage = (
        round((lifetime_net_cash_flow / installation_cost) * 100.0, 1)
        if installation_cost > 0
        else 0.0
    )

    total_lifetime_expenditure = installation_cost + lifetime_operating_costs
    lcoe_per_kwh = (
        round(total_lifetime_expenditure / lifetime_total_generation_kwh, 4)
        if lifetime_total_generation_kwh > 0
        else 0.0
    )

    # Cash flow timeline
    cash_flow_timeline: List[CashFlowPoint] = []
    # Year 0: initial investment
    cumulative = -installation_cost
    cash_flow_timeline.append(
        CashFlowPoint(year=0, net_annual_cash_flow=-installation_cost, cumulative_cash_flow=round(cumulative, 2))
    )

    for y in range(1, project_lifetime_years + 1):
        cumulative += net_annual_benefit
        cash_flow_timeline.append(
            CashFlowPoint(
                year=y,
                net_annual_cash_flow=net_annual_benefit,
                cumulative_cash_flow=round(cumulative, 2),
            )
        )

    return FinancialAnalysisResult(
        installation_cost=installation_cost,
        import_tariff=import_tariff,
        export_tariff=export_tariff,
        self_consumption_ratio=self_consumption_ratio,
        annual_maintenance_cost=annual_maintenance_cost,
        project_lifetime_years=project_lifetime_years,
        total_generation_kwh=round(annual_gen_kwh, 2),
        self_consumed_kwh=self_consumed_kwh,
        exported_kwh=exported_kwh,
        avoided_import_savings=avoided_import_savings,
        export_revenue=export_revenue,
        gross_annual_savings=gross_annual_savings,
        net_annual_benefit=net_annual_benefit,
        simple_payback_years=simple_payback_years,
        is_payback_achievable=is_payback_achievable,
        payback_status=payback_status,
        lifetime_total_generation_kwh=lifetime_total_generation_kwh,
        lifetime_gross_savings=lifetime_gross_savings,
        lifetime_operating_costs=lifetime_operating_costs,
        lifetime_net_cash_flow=lifetime_net_cash_flow,
        roi_percentage=roi_percentage,
        lcoe_per_kwh=lcoe_per_kwh,
        currency_code=currency_code,
        cash_flow_timeline=cash_flow_timeline,
        warnings=warnings,
    )
