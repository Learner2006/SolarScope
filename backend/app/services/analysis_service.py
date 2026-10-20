"""Analysis coordination and persistence service."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid
from backend.app.api.schemas.analysis import (
    AnalysisResponse,
    AnalysisSummaryResponse,
    CashFlowPointSchema,
    FinancialResponseSchema,
)
from backend.app.api.schemas.scope import ScopeInputSchema
from backend.app.domain.financials import calculate_financials
from backend.app.repositories.analysis_repository import analysis_repo
from backend.app.services.generation_service import generation_service


class AnalysisService:
    """Coordinates generation simulations, financial modeling, and analysis runs."""

    async def create_analysis(
        self,
        scope: ScopeInputSchema,
        force_fixture: bool = False,
    ) -> AnalysisResponse:
        """Execute simulation, calculate financials, and persist run."""
        # 1. Simulate generation
        domain_gen, gen_response = await generation_service.simulate_generation(
            scope=scope,
            force_fixture=force_fixture,
        )

        # 2. Calculate financials
        domain_fin = calculate_financials(
            total_generation_kwh=domain_gen.total_generation_kwh,
            installation_cost=scope.installation_cost,
            import_tariff=scope.import_tariff,
            export_tariff=scope.export_tariff,
            self_consumption_ratio=scope.self_consumption_pct / 100.0,
            annual_maintenance_cost=scope.annual_maintenance_cost,
            project_lifetime_years=scope.project_lifetime_years,
            period_hours=domain_gen.period_hours,
            currency_code=scope.currency_code,
        )

        # 3. Format financial response
        cash_flow_schemas = [
            CashFlowPointSchema(
                year=cp.year,
                net_annual_cash_flow=cp.net_annual_cash_flow,
                cumulative_cash_flow=cp.cumulative_cash_flow,
            )
            for cp in domain_fin.cash_flow_timeline
        ]

        fin_response = FinancialResponseSchema(
            installation_cost=domain_fin.installation_cost,
            import_tariff=domain_fin.import_tariff,
            export_tariff=domain_fin.export_tariff,
            self_consumption_ratio=domain_fin.self_consumption_ratio,
            annual_maintenance_cost=domain_fin.annual_maintenance_cost,
            project_lifetime_years=domain_fin.project_lifetime_years,
            total_generation_kwh=domain_fin.total_generation_kwh,
            self_consumed_kwh=domain_fin.self_consumed_kwh,
            exported_kwh=domain_fin.exported_kwh,
            avoided_import_savings=domain_fin.avoided_import_savings,
            export_revenue=domain_fin.export_revenue,
            gross_annual_savings=domain_fin.gross_annual_savings,
            net_annual_benefit=domain_fin.net_annual_benefit,
            simple_payback_years=domain_fin.simple_payback_years,
            is_payback_achievable=domain_fin.is_payback_achievable,
            payback_status=domain_fin.payback_status,
            lifetime_total_generation_kwh=domain_fin.lifetime_total_generation_kwh,
            lifetime_gross_savings=domain_fin.lifetime_gross_savings,
            lifetime_operating_costs=domain_fin.lifetime_operating_costs,
            lifetime_net_cash_flow=domain_fin.lifetime_net_cash_flow,
            roi_percentage=domain_fin.roi_percentage,
            lcoe_per_kwh=domain_fin.lcoe_per_kwh,
            currency_code=domain_fin.currency_code,
            cash_flow_timeline=cash_flow_schemas,
            warnings=domain_fin.warnings,
        )

        # Combine warnings
        all_warnings: List[str] = []
        all_warnings.extend(gen_response.validation.warnings)
        all_warnings.extend(domain_fin.warnings)

        analysis_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Construct AnalysisResponse
        analysis_data = AnalysisResponse(
            analysis_id=analysis_id,
            created_at=created_at,
            scope=scope,
            generation=gen_response,
            financials=fin_response,
            scenarios={},
            all_warnings=all_warnings,
        )

        # Store domain objects and response in repository
        record = {
            "analysis_id": analysis_id,
            "created_at": created_at,
            "scope": scope.model_dump(),
            "generation": gen_response.model_dump(),
            "financials": fin_response.model_dump(),
            "domain_gen": domain_gen,
            "domain_fin": domain_fin,
            "scenarios": {},
            "all_warnings": all_warnings,
        }
        analysis_repo.save(analysis_id, record)

        return analysis_data

    def get_analysis(self, analysis_id: str) -> Optional[AnalysisResponse]:
        """Retrieve stored analysis by ID."""
        record = analysis_repo.get(analysis_id)
        if not record:
            return None
        return AnalysisResponse(
            analysis_id=record["analysis_id"],
            created_at=record["created_at"],
            scope=ScopeInputSchema(**record["scope"]),
            generation=record["generation"],
            financials=record["financials"],
            scenarios=record.get("scenarios", {}),
            all_warnings=record.get("all_warnings", []),
        )

    def list_analyses(self) -> List[AnalysisSummaryResponse]:
        """List summaries of previous analysis runs."""
        records = analysis_repo.list_all()
        summaries = []
        for r in records:
            summaries.append(
                AnalysisSummaryResponse(
                    analysis_id=r["analysis_id"],
                    created_at=r["created_at"],
                    location_name=r["scope"].get("location_name"),
                    system_capacity_kw=r["scope"].get("system_capacity_kw", 0.0),
                    total_generation_kwh=r["generation"].get("total_generation_kwh", 0.0),
                    capacity_factor_pct=r["generation"].get("capacity_factor_pct", 0.0),
                    net_annual_benefit=r["financials"].get("net_annual_benefit", 0.0),
                    simple_payback_years=r["financials"].get("simple_payback_years"),
                    is_live_retrieval=r["generation"].get("provenance", {}).get("is_live_retrieval", False),
                )
            )
        return summaries


# Global service instance
analysis_service = AnalysisService()
