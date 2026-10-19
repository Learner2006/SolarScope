"""Report compilation service for reproducible analytical audits."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from backend.app.api.schemas.analysis import FinancialResponseSchema
from backend.app.api.schemas.generation import GenerationResponseSchema, ProvenanceSchema
from backend.app.api.schemas.report import ReportResponse
from backend.app.api.schemas.scenario import ScenarioResponseSchema
from backend.app.api.schemas.scope import ScopeInputSchema
from backend.app.repositories.analysis_repository import analysis_repo

FORMULAS_AND_METHODOLOGY = {
    "Capacity Factor (CF)": "CF = Total Generation (kWh) / (System Capacity (kW) * Actual Period Hours) * 100%",
    "Self-Consumed Energy": "E_self = Total Generation (kWh) * (Self-Consumption % / 100)",
    "Grid-Exported Energy": "E_export = Total Generation (kWh) - E_self",
    "Avoided Import Savings": "Savings_import = E_self * Electricity Import Tariff ($/kWh)",
    "Export Revenue": "Revenue_export = E_export * Export Tariff ($/kWh)",
    "Gross Annual Savings": "Savings_gross = Savings_import + Revenue_export",
    "Net Annual Benefit": "Benefit_net = Savings_gross - Annual Maintenance Cost ($/year)",
    "Simple Payback Period": "Payback (years) = Installation Cost / Benefit_net (defined when Benefit_net > 0)",
    "Lifetime Net Cash Flow": "CashFlow_lifetime = (Benefit_net * Project Lifetime Years) - Installation Cost",
    "Levelized Cost of Electricity (LCOE)": "LCOE = Total Lifetime Cost / Lifetime Generation (kWh)",
}

MODEL_LIMITATIONS = [
    "Simulation does not evaluate roof structural integrity, physical tilt limits, or local electrical panel capacity.",
    "Weather reanalysis data (MERRA-2) models historical atmospheric conditions; future weather anomalies or multi-year climate shifts may cause deviations.",
    "Self-consumption is parameterized as a fixed ratio. Real-world self-consumption fluctuates hourly with household or commercial appliance loads.",
    "Inverter replacement (typically at year 12-15) is not amortized separately unless included in annual maintenance.",
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
            model_limitations=MODEL_LIMITATIONS,
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
        """Generate deterministic, rule-based conclusions from numerical outcomes."""
        conclusions = []

        # Generation finding
        conclusions.append(
            f"The proposed {scope.system_capacity_kw:.1f} kW system generates an estimated "
            f"{generation.total_generation_kwh:,.0f} kWh annually ({generation.total_generation_mwh:.2f} MWh) "
            f"with a capacity factor of {generation.capacity_factor_pct:.1f}% across {generation.period_hours:.0f} hours."
        )

        # Financial finding
        if financials.is_payback_achievable and financials.simple_payback_years is not None:
            if financials.simple_payback_years <= 7.0:
                conclusions.append(
                    f"Strong economic feasibility: simple payback is achieved in {financials.simple_payback_years:.1f} years, "
                    f"yielding a 25-year net undiscounted cash flow of ${financials.lifetime_net_cash_flow:,.2f} "
                    f"(ROI: {financials.roi_percentage:.1f}%)."
                )
            else:
                conclusions.append(
                    f"Moderate economic feasibility: simple payback is achieved in {financials.simple_payback_years:.1f} years "
                    f"within the assumed {scope.project_lifetime_years}-year design life."
                )
        else:
            conclusions.append(
                f"Financial caution: {financials.payback_status}. Capital is not recouped within the system operational life."
            )

        # Seasonal finding
        conclusions.append(
            f"Seasonal variance is significant: generation ranges from {generation.weakest_month.total_kwh:,.0f} kWh "
            f"in {generation.weakest_month.month_name} to {generation.strongest_month.total_kwh:,.0f} kWh "
            f"in {generation.strongest_month.month_name}."
        )

        # Scenario findings if present
        if scenarios:
            for s in scenarios:
                conclusions.append(f"Scenario '{s.scenario_name}': {s.delta.summary_message}")

        return conclusions


# Global service instance
report_service = ReportService()
