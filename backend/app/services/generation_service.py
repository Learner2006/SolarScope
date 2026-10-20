"""Generation orchestration service."""

from __future__ import annotations

from typing import Tuple
import anyio
from backend.app.api.schemas.generation import (
    GenerationResponseSchema,
    HourlyPointSchema,
    MonthlyMetricSchema,
    ProvenanceSchema,
    ValidationReportSchema,
)
from backend.app.api.schemas.scope import ScopeInputSchema
from backend.app.domain.generation import GenerationSummary, aggregate_generation
from backend.app.domain.time_series import validate_time_series
from backend.app.services.renewables_ninja import ninja_adapter


class GenerationService:
    """Manages solar generation data retrieval, validation, and aggregation."""

    async def simulate_generation(
        self,
        scope: ScopeInputSchema,
        force_fixture: bool = False,
    ) -> Tuple[GenerationSummary, GenerationResponseSchema]:
        """Fetch and aggregate generation for the given scope parameters."""
        loss_fraction = scope.system_losses_pct / 100.0

        raw_data, prov_meta, is_live = await ninja_adapter.fetch_pv_data(
            lat=scope.latitude,
            lon=scope.longitude,
            date_from=scope.start_date.isoformat(),
            date_to=scope.end_date.isoformat(),
            system_loss=loss_fraction,
            tilt=scope.tilt_degrees,
            azim=scope.azimuth_degrees,
            force_fixture=force_fixture,
        )

        # Validate intervals on worker thread pool to prevent blocking the asyncio event loop
        intervals, val_result = await anyio.to_thread.run_sync(
            validate_time_series,
            raw_data,
            scope.start_date,
            scope.end_date,
        )

        if "api_warning" in prov_meta:
            val_result.warnings.append(prov_meta["api_warning"])

        # Disclose benchmark fixture limitation if custom tilt/azimuth requested for fixed San Francisco fixture
        if prov_meta.get("source_type") == "local_fixture" and (
            abs(scope.tilt_degrees - 30.0) > 0.01 or abs(scope.azimuth_degrees - 180.0) > 0.01
        ):
            val_result.warnings.append(
                "Benchmark Fixture Limitation: The San Francisco baseline fixture was recorded with a fixed 30° tilt and "
                "180° South-facing panel orientation. Hourly generation profile does not re-simulate incidence angles for custom tilts."
            )
        elif prov_meta.get("source_type") == "solarscope_astronomical_model":
            val_result.warnings.append(
                f"Theoretical Model Notice: Generation estimated via astronomical celestial position and clear-sky irradiance "
                f"for {scope.tilt_degrees:.0f}° tilt and {scope.azimuth_degrees:.0f}° azimuth. Does not account for historical cloud cover or microclimate."
            )

        # Aggregate generation with system losses derate on worker thread pool
        domain_summary = await anyio.to_thread.run_sync(
            aggregate_generation,
            intervals,
            scope.system_capacity_kw,
            val_result,
            1.0,
            scope.system_losses_pct,
            10.0,
        )

        # Build response schema
        monthly_schemas = [
            MonthlyMetricSchema(
                year=m.year,
                month=m.month,
                month_name=m.month_name,
                month_label=m.month_label,
                total_kwh=m.total_kwh,
                peak_kw=m.peak_kw,
                average_kw=m.average_kw,
                sunlight_hours=m.sunlight_hours,
                total_hours=m.total_hours,
                capacity_factor_pct=m.capacity_factor_pct,
                daily_average_kwh=m.daily_average_kwh,
            )
            for m in domain_summary.monthly_breakdown
        ]

        weakest_schema = MonthlyMetricSchema(
            year=domain_summary.weakest_month.year,
            month=domain_summary.weakest_month.month,
            month_name=domain_summary.weakest_month.month_name,
            month_label=domain_summary.weakest_month.month_label,
            total_kwh=domain_summary.weakest_month.total_kwh,
            peak_kw=domain_summary.weakest_month.peak_kw,
            average_kw=domain_summary.weakest_month.average_kw,
            sunlight_hours=domain_summary.weakest_month.sunlight_hours,
            total_hours=domain_summary.weakest_month.total_hours,
            capacity_factor_pct=domain_summary.weakest_month.capacity_factor_pct,
            daily_average_kwh=domain_summary.weakest_month.daily_average_kwh,
        )

        strongest_schema = MonthlyMetricSchema(
            year=domain_summary.strongest_month.year,
            month=domain_summary.strongest_month.month,
            month_name=domain_summary.strongest_month.month_name,
            month_label=domain_summary.strongest_month.month_label,
            total_kwh=domain_summary.strongest_month.total_kwh,
            peak_kw=domain_summary.strongest_month.peak_kw,
            average_kw=domain_summary.strongest_month.average_kw,
            sunlight_hours=domain_summary.strongest_month.sunlight_hours,
            total_hours=domain_summary.strongest_month.total_hours,
            capacity_factor_pct=domain_summary.strongest_month.capacity_factor_pct,
            daily_average_kwh=domain_summary.strongest_month.daily_average_kwh,
        )

        validation_schema = ValidationReportSchema(
            total_intervals=val_result.total_intervals,
            expected_intervals=val_result.expected_intervals,
            missing_intervals=val_result.missing_intervals,
            is_continuous=val_result.is_continuous,
            start_time=val_result.start_time.isoformat() if val_result.start_time else None,
            end_time=val_result.end_time.isoformat() if val_result.end_time else None,
            actual_hours=val_result.actual_hours,
            warnings=val_result.warnings,
        )

        provenance_schema = ProvenanceSchema(
            source_type=prov_meta["source_type"],
            dataset_name=prov_meta["dataset_name"],
            retrieval_timestamp=prov_meta["retrieval_timestamp"],
            attribution=prov_meta["attribution"],
            coordinates_used=prov_meta["coordinates_used"],
            is_live_retrieval=is_live,
        )

        hourly_schemas = {
            m_num: [
                HourlyPointSchema(
                    timestamp=p.timestamp,
                    hour=p.hour,
                    day=p.day,
                    month=p.month,
                    generation_kw=p.generation_kw,
                )
                for p in pts
            ]
            for m_num, pts in domain_summary.hourly_profiles_by_month.items()
        }

        response_schema = GenerationResponseSchema(
            system_capacity_kw=domain_summary.system_capacity_kw,
            total_generation_kwh=domain_summary.total_generation_kwh,
            total_generation_mwh=domain_summary.total_generation_mwh,
            period_hours=domain_summary.period_hours,
            capacity_factor_pct=domain_summary.capacity_factor_pct,
            peak_power_kw=domain_summary.peak_power_kw,
            peak_timestamp=domain_summary.peak_timestamp,
            daily_average_kwh=domain_summary.daily_average_kwh,
            monthly_breakdown=monthly_schemas,
            weakest_month=weakest_schema,
            strongest_month=strongest_schema,
            validation=validation_schema,
            provenance=provenance_schema,
            hourly_profiles_by_month=hourly_schemas,
        )

        return domain_summary, response_schema


# Global service instance
generation_service = GenerationService()
