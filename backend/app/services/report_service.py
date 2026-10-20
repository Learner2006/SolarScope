"""Report compilation service for reproducible analytical audits."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from backend.app.api.schemas.analysis import FinancialResponseSchema
from backend.app.api.schemas.generation import GenerationResponseSchema, ProvenanceSchema
from backend.app.api.schemas.report import ReportResponse
from backend.app.api.schemas.scenario import ScenarioResponseSchema
from backend.app.api.schemas.scope import ScopeInputSchema
from backend.app.domain.financials import get_currency_symbol
from backend.app.repositories.analysis_repository import analysis_repo

FORMULAS_AND_METHODOLOGY = {
    "Capacity Factor (CF)": "CF = Total Generation (kWh) / (System Capacity (kW) * Modeled Period Hours) * 100%",
    "Self-Consumed Energy": "E_self = Total Generation (kWh) * (Self-Consumption % / 100)",
    "Grid-Exported Energy": "E_export = Total Generation (kWh) - E_self",
    "Avoided Import Savings": "Savings_import = E_self * Electricity Import Tariff (currency/kWh)",
    "Export Revenue": "Revenue_export = E_export * Export Tariff (currency/kWh)",
    "Gross Annual Savings": "Savings_gross = Savings_import + Revenue_export",
    "Net Annual Benefit": "Benefit_net = Savings_gross - Annual Maintenance Cost (currency/year)",
    "Simple Payback Period": "Payback (years) = Installation Cost / Benefit_net (defined when Benefit_net > 0)",
    "Lifetime Net Cash Flow": "CashFlow_lifetime = (Benefit_net * Project Lifetime Years) - Installation Cost (Undiscounted Cumulative Net Profit)",
    "Undiscounted Return on Investment (ROI)": "ROI (%) = (Lifetime Net Cash Flow / Installation Cost) * 100% (Undiscounted nominal return over project lifetime)",
    "Levelized Cost of Electricity (LCOE)": "LCOE = [Installation Cost + (Annual Maintenance * Lifetime Years)] / Lifetime Generation (kWh) (Undiscounted nominal currency/kWh; includes lifetime O&M, excludes discounting, panel degradation, and mid-life inverter replacement)",
}

BASE_MODEL_LIMITATIONS = [
    "Simulation does not evaluate roof structural integrity, physical tilt limits, or local electrical panel capacity.",
    "Lifetime projections assume the evaluated year is representative across the operational lifetime with 0% panel degradation, flat nominal tariffs, and undiscounted cash flows (inflation and discounting omitted).",
    "Self-consumption is parameterized as a fixed ratio. Real-world self-consumption fluctuates hourly with household or commercial appliance loads.",
    "Inverter replacement (typically at year 10-15) is not amortized separately unless included in annual O&M maintenance reserves.",
    "Taxes, local utility interconnection fees, net billing time-of-use tariffs, and tax equity incentives are not automatically assumed.",
]


class ReportService:
    """Compiles reproducible audit reports from stored analyses."""

    def generate_report(self, analysis_id: str) -> Optional[ReportResponse]:
        """Compile a report record from an existing analysis."""
        record = analysis_repo.get(analysis_id)
        if not record:
            return None

        scope = ScopeInputSchema(**record["scope"])
        generation = GenerationResponseSchema(**record["generation"])
        financials = FinancialResponseSchema(**record["financials"])

        # Collect scenarios
        scenarios: List[ScenarioResponseSchema] = []
        for s_data in record.get("scenarios", {}).values():
            scenarios.append(ScenarioResponseSchema(**s_data))

        # Tailor model limitations to actual generation provenance using explicit source_type branches
        limitations = list(BASE_MODEL_LIMITATIONS)
        source_type = getattr(generation.provenance, "source_type", "")
        if source_type == "solarscope_astronomical_model":
            limitations.append(
                "Theoretical Clear-Sky Model Notice: Generation was calculated using mathematical celestial geometry "
                "and optical air mass clear-sky irradiance. It does not include historical local cloud cover or microclimate."
            )
        elif source_type == "local_fixture":
            limitations.append(
                "Synthetic Benchmark Fixture Notice: Generation is derived from an offline synthetic reference fixture "
                "(San Francisco 2019 baseline) for testing and calibration. It does not represent verified MERRA-2 "
                "historical satellite reanalysis or measured on-site telemetry."
            )
        elif source_type == "renewables_ninja_api":
            limitations.append(
                "Weather Reanalysis Data (MERRA-2) Notice: Generation was retrieved from Renewables.ninja modeling "
                "historical atmospheric conditions; future weather anomalies or multi-year climate shifts may cause deviations."
            )
        else:
            limitations.append(
                f"Data Source Notice: Generation data was supplied by source type '{source_type}'. "
                "Results should be reviewed under the corresponding provider assumptions."
            )

        # Deterministic conclusions
        conclusions = self._generate_conclusions(scope, generation, financials, scenarios)

        return ReportResponse(
            analysis_id=analysis_id,
            generated_at=datetime.utcnow().isoformat() + "Z",
            scope=scope,
            generation=generation,
            financials=financials,
            scenarios=scenarios,
            provenance=generation.provenance,
            formulas_and_methodology=FORMULAS_AND_METHODOLOGY,
            model_limitations=limitations,
            data_quality_warnings=record.get("all_warnings", []),
            conclusions=conclusions,
        )

    def _generate_conclusions(
        self,
        scope: ScopeInputSchema,
        generation: GenerationResponseSchema,
        financials: FinancialResponseSchema,
        scenarios: List[ScenarioResponseSchema],
    ) -> List[str]:
        """Generate deterministic, rule-based conclusions from numerical outcomes.

        Architectural Decision / Reproducibility:
        Audit report findings are compiled using rule-based deterministic logic rather than
        an LLM summarizer. This guarantees that:
        1) Reports are byte-for-byte reproducible for compliance audits.
        2) Stated numbers strictly match the tabular data without hallucinated discrepancies.
        3) Report generation adds zero network latency or API token cost.
        """
        conclusions = []

        # Period Generation vs Annual Normalized Equivalent:
        # If the analysis duration is ~8,760 hours (+/-48h buffer for leap years), we describe it as annual generation.
        # For partial periods, we explicitly distinguish the period total from its annualized equivalent.
        if abs(generation.period_hours - 8760.0) <= 48:
            conclusions.append(
                f"The proposed {scope.system_capacity_kw:.1f} kW system generates an estimated "
                f"{generation.total_generation_kwh:,.0f} kWh annually ({generation.total_generation_mwh:.2f} MWh) "
                f"with a capacity factor of {generation.capacity_factor_pct:.1f}% across {generation.period_hours:,.0f} modeled hours."
            )
        else:
            conclusions.append(
                f"The proposed {scope.system_capacity_kw:.1f} kW system generates an estimated "
                f"{generation.total_generation_kwh:,.0f} kWh across the {generation.period_hours:,.0f}-hour evaluated modeled period "
                f"(normalized annual equivalent: {financials.total_generation_kwh:,.0f} kWh/yr) "
                f"with a capacity factor of {generation.capacity_factor_pct:.1f}%."
            )

        # Financial finding: use selected project lifetime and explicitly state payback within lifetime
        curr_sym = get_currency_symbol(getattr(financials, "currency_code", "USD"))
        if financials.is_payback_achievable and financials.simple_payback_years is not None:
            conclusions.append(
                f"Under the stated financial assumptions, the modeled simple payback is approximately "
                f"{financials.simple_payback_years:.1f} years, within the assumed {scope.project_lifetime_years}-year "
                f"project lifetime, yielding an undiscounted {scope.project_lifetime_years}-year net cash flow of "
                f"{curr_sym}{financials.lifetime_net_cash_flow:,.2f} (ROI: {financials.roi_percentage:.1f}%)."
            )
        else:
            conclusions.append(
                f"Under the stated financial assumptions, modeled simple payback does not fall within the assumed {scope.project_lifetime_years}-year "
                f"project lifetime ({financials.payback_status})."
            )

        # Seasonal finding: conditional on multi-month evidence rather than permanently displayed
        if len(generation.monthly_breakdown) >= 2:
            ratio = (
                generation.strongest_month.daily_average_kwh
                / max(0.001, generation.weakest_month.daily_average_kwh)
            )
            if ratio >= 1.25 and generation.weakest_month.month != generation.strongest_month.month:
                conclusions.append(
                    f"Seasonal variance is observed across the modeled period: daily average generation ranges from "
                    f"{generation.weakest_month.daily_average_kwh:.1f} kWh/day ({generation.weakest_month.month_name}) "
                    f"to {generation.strongest_month.daily_average_kwh:.1f} kWh/day ({generation.strongest_month.month_name})."
                )
            else:
                conclusions.append(
                    f"Seasonal generation remains relatively uniform across the modeled period (daily average: "
                    f"{generation.weakest_month.daily_average_kwh:.1f} to {generation.strongest_month.daily_average_kwh:.1f} kWh/day)."
                )
        else:
            month_name = (
                generation.weakest_month.month_name if generation.weakest_month else "the evaluated period"
            )
            conclusions.append(
                f"Analysis period covers {month_name} only; multi-month seasonal variance cannot be assessed from this period."
            )

        # Scenario findings if present
        if scenarios:
            for s in scenarios:
                conclusions.append(f"Scenario '{s.scenario_name}': {s.delta.summary_message}")

        return conclusions


# Global service instance
report_service = ReportService()
