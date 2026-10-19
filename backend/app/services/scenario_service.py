"""Scenario evaluation service."""

from __future__ import annotations

from typing import Optional
from backend.app.api.schemas.analysis import CashFlowPointSchema, FinancialResponseSchema
from backend.app.api.schemas.scenario import (
    ScenarioDeltaSchema,
    ScenarioRequestSchema,
    ScenarioResponseSchema,
)
from backend.app.domain.scenarios import (
    ScenarioParameters,
    evaluate_scenario,
)
from backend.app.repositories.analysis_repository import analysis_repo


class ScenarioService:
    """Manages baseline-isolated sensitivity scenarios and deltas."""

    def run_scenario(
        self,
        analysis_id: str,
        request: ScenarioRequestSchema,
    ) -> Optional[ScenarioResponseSchema]:
        """Evaluate a scenario against an existing baseline run without mutating it."""
        record = analysis_repo.get(analysis_id)
        if not record:
            return None

        domain_gen = record["domain_gen"]
        domain_fin = record["domain_fin"]

        # Calculate multiplier
        gen_mult = 1.0
        if request.generation_pct_adjustment is not None:
            gen_mult = max(0.0, 1.0 + (request.generation_pct_adjustment / 100.0))

        self_consumption_ratio = None
        if request.self_consumption_pct_override is not None:
            self_consumption_ratio = request.self_consumption_pct_override / 100.0

        params = ScenarioParameters(
            scenario_id=request.scenario_id,
            scenario_name=request.scenario_name,
            description=request.description,
            generation_multiplier=gen_mult,
            installation_cost_override=request.installation_cost_override,
            import_tariff_override=request.import_tariff_override,
            export_tariff_override=request.export_tariff_override,
            self_consumption_override=self_consumption_ratio,
        )

        comparison = evaluate_scenario(
            baseline_generation=domain_gen,
            baseline_financials=domain_fin,
            parameters=params,
        )

        # Build FinancialResponseSchema for scenario
        scenario_cf_schemas = [
            CashFlowPointSchema(
                year=cp.year,
                net_annual_cash_flow=cp.net_annual_cash_flow,
                cumulative_cash_flow=cp.cumulative_cash_flow,
            )
            for cp in comparison.scenario_financials.cash_flow_timeline
        ]

        scenario_fin_schema = FinancialResponseSchema(
            installation_cost=comparison.scenario_financials.installation_cost,
            import_tariff=comparison.scenario_financials.import_tariff,
            export_tariff=comparison.scenario_financials.export_tariff,
            self_consumption_ratio=comparison.scenario_financials.self_consumption_ratio,
            annual_maintenance_cost=comparison.scenario_financials.annual_maintenance_cost,
            project_lifetime_years=comparison.scenario_financials.project_lifetime_years,
            total_generation_kwh=comparison.scenario_financials.total_generation_kwh,
            self_consumed_kwh=comparison.scenario_financials.self_consumed_kwh,
            exported_kwh=comparison.scenario_financials.exported_kwh,
            avoided_import_savings=comparison.scenario_financials.avoided_import_savings,
            export_revenue=comparison.scenario_financials.export_revenue,
            gross_annual_savings=comparison.scenario_financials.gross_annual_savings,
            net_annual_benefit=comparison.scenario_financials.net_annual_benefit,
            simple_payback_years=comparison.scenario_financials.simple_payback_years,
            is_payback_achievable=comparison.scenario_financials.is_payback_achievable,
            payback_status=comparison.scenario_financials.payback_status,
            lifetime_total_generation_kwh=comparison.scenario_financials.lifetime_total_generation_kwh,
            lifetime_gross_savings=comparison.scenario_financials.lifetime_gross_savings,
            lifetime_operating_costs=comparison.scenario_financials.lifetime_operating_costs,
            lifetime_net_cash_flow=comparison.scenario_financials.lifetime_net_cash_flow,
            roi_percentage=comparison.scenario_financials.roi_percentage,
            lcoe_per_kwh=comparison.scenario_financials.lcoe_per_kwh,
            cash_flow_timeline=scenario_cf_schemas,
            warnings=comparison.scenario_financials.warnings,
        )

        delta_schema = ScenarioDeltaSchema(
            generation_diff_kwh=comparison.delta.generation_diff_kwh,
            generation_diff_pct=comparison.delta.generation_diff_pct,
            gross_savings_diff_usd=comparison.delta.gross_savings_diff_usd,
            gross_savings_diff_pct=comparison.delta.gross_savings_diff_pct,
            net_annual_benefit_diff_usd=comparison.delta.net_annual_benefit_diff_usd,
            payback_diff_years=comparison.delta.payback_diff_years,
            lifetime_cash_flow_diff_usd=comparison.delta.lifetime_cash_flow_diff_usd,
            lifetime_cash_flow_diff_pct=comparison.delta.lifetime_cash_flow_diff_pct,
            summary_message=comparison.delta.summary_message,
        )

        response = ScenarioResponseSchema(
            scenario_id=comparison.scenario_id,
            scenario_name=comparison.scenario_name,
            description=comparison.description,
            baseline_financials=FinancialResponseSchema(**record["financials"]),
            scenario_financials=scenario_fin_schema,
            delta=delta_schema,
            warnings=comparison.warnings,
        )

        # Store scenario in analysis record
        analysis_repo.save_scenario(analysis_id, request.scenario_id, response.model_dump())

        return response


# Global service instance
scenario_service = ScenarioService()
