"""Regression tests reproducing critical findings before fixing them.

Critical Recovery Audit:
1. Solar azimuth convention (North vs South, East vs West symmetry, Southern Hemisphere).
2. Upstream API failure handling (no silent substitution of SF fixture for other locations).
3. Unsupported date range rejection (never return HTTP 201 with 0 intervals / fabricated results).
4. Local fixture provenance (honest labeling as synthetic benchmark, not verified MERRA-2).
5. HTTPException code preservation and sanitized error messages.
"""

from datetime import date
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.domain.solar_model import simulate_astronomical_pv
from backend.app.services.renewables_ninja import RenewablesNinjaAdapter, ninja_adapter


client = TestClient(app)


class TestSolarAzimuthDefects:
    """Verify physical solar azimuth conventions and incidence geometry."""

    def test_northern_hemisphere_winter_south_vs_north(self):
        """In Northern Hemisphere winter (Dec 21, SF), South-facing panels must produce much more than North-facing."""
        # San Francisco: 37.7749 N, -122.4194 W, 30 deg tilt
        _, kwh_south, _ = simulate_astronomical_pv(
            latitude=37.7749,
            longitude=-122.4194,
            start_date=date(2019, 12, 21),
            end_date=date(2019, 12, 21),
            tilt_degrees=30.0,
            azimuth_degrees=180.0,  # South
        )
        _, kwh_north, _ = simulate_astronomical_pv(
            latitude=37.7749,
            longitude=-122.4194,
            start_date=date(2019, 12, 21),
            end_date=date(2019, 12, 21),
            tilt_degrees=30.0,
            azimuth_degrees=0.0,    # North
        )
        # Physical reality: In SF on winter solstice, sun stays to the south all day (max elevation ~28.8 deg).
        # South-facing panels receive strong direct beam sunlight; North-facing panels receive zero direct beam.
        assert kwh_south > 1.5, f"Expected South-facing generation > 1.5 kWh, got {kwh_south}"
        assert kwh_south > kwh_north * 3.0, (
            f"South ({kwh_south} kWh) should greatly exceed North ({kwh_north} kWh) in SF winter solstice!"
        )

    def test_southern_hemisphere_winter_north_vs_south(self):
        """In Southern Hemisphere winter (June 21, Sydney), North-facing panels must produce much more than South-facing."""
        # Sydney: -33.8688 S, 151.2093 E, 30 deg tilt
        _, kwh_north, _ = simulate_astronomical_pv(
            latitude=-33.8688,
            longitude=151.2093,
            start_date=date(2019, 6, 21),
            end_date=date(2019, 6, 21),
            tilt_degrees=30.0,
            azimuth_degrees=0.0,    # North
        )
        _, kwh_south, _ = simulate_astronomical_pv(
            latitude=-33.8688,
            longitude=151.2093,
            start_date=date(2019, 6, 21),
            end_date=date(2019, 6, 21),
            tilt_degrees=30.0,
            azimuth_degrees=180.0,  # South
        )
        assert kwh_north > 1.5, f"Expected North-facing generation > 1.5 kWh, got {kwh_north}"
        assert kwh_north > kwh_south * 3.0, (
            f"North ({kwh_north} kWh) should greatly exceed South ({kwh_south} kWh) in Sydney winter solstice!"
        )

    def test_east_west_diurnal_symmetry(self):
        """Due East (90 deg) and Due West (270 deg) panels on equinox must produce identical total daily energy."""
        # Equinox (March 21) at equator or mid-latitude
        data_east, kwh_east, _ = simulate_astronomical_pv(
            latitude=37.7749,
            longitude=-122.4194,
            start_date=date(2019, 3, 21),
            end_date=date(2019, 3, 21),
            tilt_degrees=30.0,
            azimuth_degrees=90.0,   # East
        )
        data_west, kwh_west, _ = simulate_astronomical_pv(
            latitude=37.7749,
            longitude=-122.4194,
            start_date=date(2019, 3, 21),
            end_date=date(2019, 3, 21),
            tilt_degrees=30.0,
            azimuth_degrees=270.0,  # West
        )
        assert abs(kwh_east - kwh_west) < 0.05, (
            f"East ({kwh_east} kWh) and West ({kwh_west} kWh) daily generation should be symmetrical on equinox!"
        )

    def test_tilt_response_in_winter(self):
        """In SF winter, tilting panels toward the sun (~35-45 deg South) must produce more than flat (0 deg)."""
        _, kwh_flat, _ = simulate_astronomical_pv(
            latitude=37.7749,
            longitude=-122.4194,
            start_date=date(2019, 12, 21),
            end_date=date(2019, 12, 21),
            tilt_degrees=0.0,       # Flat on the ground
            azimuth_degrees=180.0,
        )
        _, kwh_tilted, _ = simulate_astronomical_pv(
            latitude=37.7749,
            longitude=-122.4194,
            start_date=date(2019, 12, 21),
            end_date=date(2019, 12, 21),
            tilt_degrees=38.0,      # Tilted approximately at latitude
            azimuth_degrees=180.0,  # South
        )
        assert kwh_tilted > kwh_flat * 1.5, (
            f"Tilted panel ({kwh_tilted} kWh) must outperform flat panel ({kwh_flat} kWh) in winter!"
        )


class TestUpstreamFailureAndSubstitutionDefects:
    """Verify that external API failures never silently substitute SF data for other locations."""

    @pytest.mark.anyio
    async def test_upstream_api_failure_for_delhi_does_not_return_sf_fixture(self):
        """If upstream API fails for Delhi, it must raise UpstreamServiceError and NOT return SF fixture."""
        from backend.app.services.renewables_ninja import UpstreamServiceError

        adapter = RenewablesNinjaAdapter(api_token="mock_valid_token")

        mock_resp = MagicMock()
        mock_resp.status_code = 502
        mock_resp.text = "Bad Gateway from Renewables.ninja"

        with patch("httpx.AsyncClient.get", return_value=mock_resp):
            with pytest.raises(UpstreamServiceError) as exc_info:
                await adapter.fetch_pv_data(
                    lat=28.6139,
                    lon=77.2090,
                    date_from="2019-01-01",
                    date_to="2019-12-31",
                )
            assert exc_info.value.status_code == 502
            assert "upstream API returned error" in str(exc_info.value)


class TestDateRangeValidationDefects:
    """Verify unsupported date ranges are rejected and never return HTTP 201 with 0 intervals."""

    def test_unsupported_year_for_fixture_is_rejected(self):
        """Requesting 2024 for the 2019 SF fixture must return 400/422, never 201 with 0 kWh."""
        resp = client.post(
            "/api/analyses?force_fixture=true",
            json={
                "location_name": "San Francisco, CA",
                "latitude": 37.7749,
                "longitude": -122.4194,
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
                "system_capacity_kw": 5.0,
                "tilt_degrees": 30.0,
                "azimuth_degrees": 180.0,
                "system_losses_pct": 10.0,
                "installation_cost": 7500.0,
                "import_tariff": 0.28,
                "export_tariff": 0.06,
                "self_consumption_pct": 65.0,
                "annual_maintenance_cost": 75.0,
                "project_lifetime_years": 25,
                "currency_code": "USD",
            },
        )
        # Must NOT return HTTP 201 Created with 0 kWh / empty analysis
        assert resp.status_code in [400, 422], (
            f"Expected 400 or 422 for unsupported fixture date range 2024, got {resp.status_code}: {resp.text}"
        )


class TestProvenanceAttributionDefects:
    """Verify that fixture data is honestly labeled as synthetic benchmark, not verified MERRA-2."""

    def test_fixture_metadata_does_not_claim_verified_merra2_reanalysis(self):
        """The local fixture metadata must identify as synthetic benchmark and not claim verified MERRA-2."""
        _, meta, _ = ninja_adapter._load_fixture(37.7749, -122.4194, "2019-01-01", "2019-12-31")
        dataset_name = meta.get("dataset_name", "")
        attribution = meta.get("attribution", "")

        assert "Synthetic" in dataset_name or "Benchmark" in dataset_name, (
            f"Dataset name should explicitly indicate synthetic benchmark fixture, got '{dataset_name}'"
        )
        assert "MERRA-2 2019 historical reanalysis" not in dataset_name, (
            "Must NOT claim to be verified 'MERRA-2 2019 historical reanalysis' when using synthetic fixture!"
        )
        assert "Pfenninger and I. Staffell" not in attribution, (
            "Must NOT cite Pfenninger & Staffell (2016) paper for synthetic development fixture!"
        )


class TestHttpExceptionPreservationDefects:
    """Verify HTTPException status codes are preserved and not clobbered into 500."""

    def test_scenario_nonexistent_analysis_returns_404_not_500(self):
        """Requesting scenario on nonexistent analysis must return 404, not 500."""
        resp = client.post(
            "/api/analyses/nonexistent-analysis-id-99999/scenarios",
            json={
                "scenario_id": "test_scenario",
                "scenario_name": "Test Scenario",
                "description": "Test description",
                "generation_pct_adjustment": -10.0,
            },
        )
        assert resp.status_code == 404, (
            f"Expected 404 Not Found for nonexistent analysis, got {resp.status_code}: {resp.text}"
        )


class TestFullPhysicsAndEdgeCases:
    """Rigorous physical validation over full annual periods, horizontal panels, and zero limits."""

    def test_full_year_northern_hemisphere_south_vs_north(self):
        """Full year in SF: South-facing (180°) must substantially outperform North-facing (0°)."""
        _, kwh_south, hours_s = simulate_astronomical_pv(
            latitude=37.7749,
            longitude=-122.4194,
            start_date=date(2019, 1, 1),
            end_date=date(2019, 12, 31),
            tilt_degrees=30.0,
            azimuth_degrees=180.0,  # South
        )
        _, kwh_north, hours_n = simulate_astronomical_pv(
            latitude=37.7749,
            longitude=-122.4194,
            start_date=date(2019, 1, 1),
            end_date=date(2019, 12, 31),
            tilt_degrees=30.0,
            azimuth_degrees=0.0,    # North
        )
        assert hours_s == 8760
        assert hours_n == 8760
        assert kwh_south > 1400.0, f"Expected SF South annual generation > 1400 kWh, got {kwh_south}"
        # In SF, sun is in southern sky almost the entire year; South produces ~1.7x North
        assert kwh_south > kwh_north * 1.5, (
            f"SF South annual ({kwh_south:.1f} kWh) must exceed North ({kwh_north:.1f} kWh) by >50%!"
        )

    def test_full_year_southern_hemisphere_north_vs_south(self):
        """Full year in Sydney: North-facing (0°) must substantially outperform South-facing (180°)."""
        _, kwh_north, hours_n = simulate_astronomical_pv(
            latitude=-33.8688,
            longitude=151.2093,
            start_date=date(2019, 1, 1),
            end_date=date(2019, 12, 31),
            tilt_degrees=30.0,
            azimuth_degrees=0.0,    # North
        )
        _, kwh_south, hours_s = simulate_astronomical_pv(
            latitude=-33.8688,
            longitude=151.2093,
            start_date=date(2019, 1, 1),
            end_date=date(2019, 12, 31),
            tilt_degrees=30.0,
            azimuth_degrees=180.0,  # South
        )
        assert hours_n == 8760
        assert hours_s == 8760
        assert kwh_north > 1400.0, f"Expected Sydney North annual generation > 1400 kWh, got {kwh_north}"
        assert kwh_north > kwh_south * 1.5, (
            f"Sydney North annual ({kwh_north:.1f} kWh) must exceed South ({kwh_south:.1f} kWh) by >50%!"
        )

    def test_horizontal_panel_azimuth_invariance(self):
        """A flat horizontal panel (tilt=0) has normal vector straight up [0,0,1]; azimuth must not affect generation."""
        # Test 4 cardinal azimuth orientations for flat panel
        _, kwh_0, _ = simulate_astronomical_pv(37.7749, -122.4194, date(2019, 1, 1), date(2019, 12, 31), tilt_degrees=0.0, azimuth_degrees=0.0)
        _, kwh_90, _ = simulate_astronomical_pv(37.7749, -122.4194, date(2019, 1, 1), date(2019, 12, 31), tilt_degrees=0.0, azimuth_degrees=90.0)
        _, kwh_180, _ = simulate_astronomical_pv(37.7749, -122.4194, date(2019, 1, 1), date(2019, 12, 31), tilt_degrees=0.0, azimuth_degrees=180.0)
        _, kwh_270, _ = simulate_astronomical_pv(37.7749, -122.4194, date(2019, 1, 1), date(2019, 12, 31), tilt_degrees=0.0, azimuth_degrees=270.0)

        assert kwh_0 == kwh_90 == kwh_180 == kwh_270, (
            f"Horizontal panel must be invariant to azimuth! Got: 0°={kwh_0}, 90°={kwh_90}, 180°={kwh_180}, 270°={kwh_270}"
        )

    def test_nighttime_zero_generation_strict_edge_case(self):
        """All nighttime intervals must evaluate to strictly 0.0 kW power without negative or residual values."""
        data, _, _ = simulate_astronomical_pv(
            latitude=37.7749,
            longitude=-122.4194,
            start_date=date(2019, 6, 21),
            end_date=date(2019, 6, 21),
            tilt_degrees=30.0,
            azimuth_degrees=180.0,
        )
        # SF is longitude -122.4° (UTC-8.16 solar offset).
        # Local midnight (00:00 solar hour) corresponds to ~08:00 UTC.
        # Check deep nighttime UTC hours (06:00 to 11:00 UTC, which is 21:50 to 02:50 local solar time)
        night_hours = [
            "2019-06-21 06:00",
            "2019-06-21 07:00",
            "2019-06-21 08:00",
            "2019-06-21 09:00",
            "2019-06-21 10:00",
            "2019-06-21 11:00",
        ]
        for ts in night_hours:
            val = data[ts]["electricity"]
            assert val == 0.0, f"Nighttime timestamp {ts} expected 0.0 kW, got {val}"

    def test_tilt_sensitivity_curve_annual(self):
        """In Northern mid-latitudes (SF ~38° N), optimal tilt (~30°) must exceed flat (0°) and vertical wall (90°)."""
        _, kwh_flat, _ = simulate_astronomical_pv(37.7749, -122.4194, date(2019, 1, 1), date(2019, 12, 31), tilt_degrees=0.0, azimuth_degrees=180.0)
        _, kwh_optimal, _ = simulate_astronomical_pv(37.7749, -122.4194, date(2019, 1, 1), date(2019, 12, 31), tilt_degrees=30.0, azimuth_degrees=180.0)
        _, kwh_vertical, _ = simulate_astronomical_pv(37.7749, -122.4194, date(2019, 1, 1), date(2019, 12, 31), tilt_degrees=90.0, azimuth_degrees=180.0)

        # 30° tilt should produce more annual energy than 0° (flat) and 90° (vertical)
        assert kwh_optimal > kwh_flat, f"Optimal tilt ({kwh_optimal:.1f}) should exceed flat ({kwh_flat:.1f})"
        assert kwh_optimal > kwh_vertical, f"Optimal tilt ({kwh_optimal:.1f}) should exceed vertical ({kwh_vertical:.1f})"


class TestSafetyAndLimits:
    """Verify concurrency limits, repository bounded retention, and upstream failure isolation."""

    def test_repository_bounded_retention(self):
        """Repository must evict oldest analyses FIFO when capacity (100) is reached."""
        from backend.app.repositories.analysis_repository import AnalysisRepository

        repo = AnalysisRepository(max_capacity=5)
        # Save 8 items
        for i in range(8):
            repo.save(f"id_{i}", {"created_at": f"2026-01-0{i}", "data": i})

        assert len(repo._store) == 5
        # Oldest items (id_0, id_1, id_2) must be evicted
        assert repo.get("id_0") is None
        assert repo.get("id_1") is None
        assert repo.get("id_2") is None
        # Recent items must be preserved
        assert repo.get("id_3") is not None
        assert repo.get("id_7") is not None

    def test_concurrency_limit_enforcement(self):
        """When simulation semaphore is exhausted, requests return HTTP 429."""
        from backend.app.main import _SIMULATION_SEMAPHORE

        orig_value = _SIMULATION_SEMAPHORE._value
        _SIMULATION_SEMAPHORE._value = 0

        try:
            resp = client.post(
                "/api/analyses?force_fixture=true",
                json={
                    "location_name": "San Francisco, CA",
                    "latitude": 37.7749,
                    "longitude": -122.4194,
                    "start_date": "2019-01-01",
                    "end_date": "2019-12-31",
                    "system_capacity_kw": 5.0,
                },
            )
            assert resp.status_code == 429
            assert "maximum concurrent simulations reached" in resp.json()["detail"]
        finally:
            _SIMULATION_SEMAPHORE._value = orig_value


class TestPartialPeriodAndFinancialEdgeCases:
    """Verify partial period metrics, weakest month selection, zero capex, and edge case financials."""

    def test_partial_month_daily_average_uses_actual_days(self):
        """A partial month (e.g. 5 days = 120 hours) must divide by 5 days, not calendar month length (31)."""
        from datetime import datetime, timezone, timedelta
        from backend.app.domain.time_series import TimeInterval, TimeSeriesValidationResult
        from backend.app.domain.generation import aggregate_generation

        base = datetime(2019, 1, 1, 0, 0, tzinfo=timezone.utc)
        intervals = [
            TimeInterval(
                timestamp=base + timedelta(hours=h),
                power_kw=1.0,
                energy_kwh=1.0,
            )
            for h in range(120)  # exactly 5 days (120 hours)
        ]
        val = TimeSeriesValidationResult(
            total_intervals=120,
            expected_intervals=120,
            missing_intervals=0,
            is_continuous=True,
            start_time=intervals[0].timestamp,
            end_time=intervals[-1].timestamp,
            actual_hours=120.0,
            warnings=[],
        )

        summary = aggregate_generation(intervals, system_capacity_kw=1.0, validation=val)
        assert len(summary.monthly_breakdown) == 1
        jan = summary.monthly_breakdown[0]
        assert jan.total_hours == 120
        # 120 kWh / (120 / 24 = 5.0 days) = 24.0 kWh/day
        assert jan.daily_average_kwh == 24.0, (
            f"Expected daily_average_kwh == 24.0 for 5 days of 1 kW continuous, got {jan.daily_average_kwh}"
        )

    def test_weakest_month_selection_uses_daily_rate_not_raw_total(self):
        """A partial boundary month with fewer total kWh must not be selected as weakest if its daily rate is higher."""
        from datetime import datetime, timezone, timedelta
        from backend.app.domain.time_series import TimeInterval, TimeSeriesValidationResult
        from backend.app.domain.generation import aggregate_generation

        # Month 1 (Jan): 3 days (72 h) at 2 kW continuous -> 144 kWh, daily rate = 48 kWh/day
        jan_base = datetime(2019, 1, 1, 0, 0, tzinfo=timezone.utc)
        jan_intervals = [
            TimeInterval(timestamp=jan_base + timedelta(hours=h), power_kw=2.0, energy_kwh=2.0)
            for h in range(72)
        ]
        # Month 2 (Feb): 28 days (672 h) at 0.5 kW continuous -> 336 kWh, daily rate = 12 kWh/day
        feb_base = datetime(2019, 2, 1, 0, 0, tzinfo=timezone.utc)
        feb_intervals = [
            TimeInterval(timestamp=feb_base + timedelta(hours=h), power_kw=0.5, energy_kwh=0.5)
            for h in range(672)
        ]
        all_intervals = jan_intervals + feb_intervals
        val = TimeSeriesValidationResult(
            total_intervals=len(all_intervals),
            expected_intervals=len(all_intervals),
            missing_intervals=0,
            is_continuous=True,
            start_time=all_intervals[0].timestamp,
            end_time=all_intervals[-1].timestamp,
            actual_hours=float(len(all_intervals)),
            warnings=[],
        )

        summary = aggregate_generation(all_intervals, system_capacity_kw=2.0, validation=val)
        # Even though Jan has 144 kWh total and Feb has 336 kWh total, Feb's daily rate (12 kWh/day) is lower than Jan (48 kWh/day)
        assert summary.weakest_month.month == 2, (
            f"Expected Feb to be weakest based on daily rate, got month {summary.weakest_month.month}"
        )
        assert summary.strongest_month.month == 1, (
            f"Expected Jan to be strongest based on daily rate, got month {summary.strongest_month.month}"
        )

    def test_zero_capex_with_negative_net_benefit_is_non_recovering(self):
        """Zero capex when annual maintenance exceeds gross savings must be 'Non-recovering', not immediate payback."""
        from backend.app.domain.financials import calculate_financials

        result = calculate_financials(
            total_generation_kwh=1000.0,
            installation_cost=0.0,          # Zero capex
            import_tariff=0.10,
            export_tariff=0.05,
            self_consumption_ratio=0.5,     # Gross savings: 500*0.10 + 500*0.05 = $75
            annual_maintenance_cost=150.0,  # O&M ($150) > gross savings ($75) -> net benefit = -$75
            project_lifetime_years=25,
            period_hours=8760.0,
        )
        assert result.net_annual_benefit == -75.0
        assert result.simple_payback_years is None
        assert result.is_payback_achievable is False
        assert "Non-recovering" in result.payback_status

    def test_zero_generation_financial_edge_case(self):
        """Zero generation must produce LCOE 0.0, payback None, and no division by zero error."""
        from backend.app.domain.financials import calculate_financials

        result = calculate_financials(
            total_generation_kwh=0.0,
            installation_cost=5000.0,
            import_tariff=0.20,
            export_tariff=0.05,
            self_consumption_ratio=0.7,
            annual_maintenance_cost=50.0,
            project_lifetime_years=25,
            period_hours=8760.0,
        )
        assert result.gross_annual_savings == 0.0
        assert result.net_annual_benefit == -50.0
        assert result.simple_payback_years is None
        assert result.is_payback_achievable is False
        assert result.lcoe_per_kwh == 0.0
        assert "Non-recovering" in result.payback_status

    def test_single_month_report_seasonal_variance_conditional(self):
        """A single month analysis must explicitly report that multi-month seasonal variance cannot be assessed."""
        from types import SimpleNamespace
        from backend.app.services.report_service import report_service

        mock_scope = SimpleNamespace(
            location_name="San Francisco, CA",
            system_capacity_kw=5.0,
            project_lifetime_years=25,
        )
        mock_month = SimpleNamespace(
            month=1,
            month_name="January",
            daily_average_kwh=15.0,
        )
        mock_gen = SimpleNamespace(
            total_generation_kwh=450.0,
            total_generation_mwh=0.45,
            period_hours=744.0,
            capacity_factor_pct=12.1,
            monthly_breakdown=[mock_month],  # Only 1 month
            weakest_month=mock_month,
            strongest_month=mock_month,
        )
        mock_fin = SimpleNamespace(
            total_generation_kwh=5400.0,
            is_payback_achievable=True,
            simple_payback_years=8.2,
            lifetime_net_cash_flow=12000.0,
            roi_percentage=160.0,
            payback_status="Payback in 8.2 years",
            currency_code="USD",
        )

        conclusions = report_service._generate_conclusions(mock_scope, mock_gen, mock_fin, [])
        seasonal_conclusions = [c for c in conclusions if "seasonal" in c.lower() or "covers" in c.lower()]
        assert len(seasonal_conclusions) == 1
        assert "Analysis period covers January only" in seasonal_conclusions[0]
        assert "multi-month seasonal variance cannot be assessed" in seasonal_conclusions[0]


class TestTrustAndReliabilityFixes:
    """Verify NaN/Infinity 422 serialization, cardinal coordinate formatting, scenario collision 409, and explicit provenance."""

    def test_nan_and_infinity_return_serializable_422(self):
        """NaN and Infinity inputs in JSON must return HTTP 422 rather than causing 500 serialization crashes."""
        for payload in [
            '{"system_capacity_kw": NaN}',
            '{"system_capacity_kw": Infinity}',
            '{"system_capacity_kw": -Infinity}',
        ]:
            resp = client.post(
                "/api/analyses",
                content=payload,
                headers={"Content-Type": "application/json"},
            )
            assert resp.status_code == 422, f"Expected 422 for {payload}, got {resp.status_code}: {resp.text}"
            detail = resp.json()["detail"]
            assert isinstance(detail, list)
            assert len(detail) > 0

    def test_coordinate_formatting_cardinal_hemispheres(self):
        """Coordinates must format with positive magnitude and correct cardinal hemisphere letters (N/S, E/W)."""
        from backend.app.domain.solar_model import format_coordinates

        # San Francisco: Northern, Western
        sf = format_coordinates(37.7749, -122.4194)
        assert sf == "37.7749° N, 122.4194° W"
        assert "-" not in sf

        # Sydney: Southern, Eastern
        syd = format_coordinates(-33.8688, 151.2093)
        assert syd == "33.8688° S, 151.2093° E"
        assert "-" not in syd

        # São Paulo: Southern, Western
        sp = format_coordinates(-23.5505, -46.6333)
        assert sp == "23.5505° S, 46.6333° W"
        assert "-" not in sp

        # London: Northern, Greenwich
        lon = format_coordinates(51.5074, 0.1278)
        assert lon == "51.5074° N, 0.1278° E"

    def test_scenario_id_collision_returns_409_or_generates_unique_id(self):
        """Posting a duplicate scenario_id must return 409 Conflict, but auto_id=true generates a unique identifier."""
        # Create baseline analysis
        res = client.post(
            "/api/analyses?force_fixture=true",
            json={
                "location_name": "San Francisco, CA",
                "latitude": 37.7749,
                "longitude": -122.4194,
                "start_date": "2019-01-01",
                "end_date": "2019-12-31",
                "system_capacity_kw": 5.0,
            },
        )
        assert res.status_code == 201
        analysis_id = res.json()["analysis_id"]

        scen_payload = {
            "scenario_id": "test_collision_id",
            "scenario_name": "Test Collision Scenario",
            "description": "Testing collision prevention",
            "generation_pct_adjustment": -10.0,
        }

        # First creation succeeds
        first = client.post(f"/api/analyses/{analysis_id}/scenarios", json=scen_payload)
        assert first.status_code == 200
        assert first.json()["scenario_id"] == "test_collision_id"

        # Duplicate creation without auto_id must return 409 Conflict
        duplicate = client.post(f"/api/analyses/{analysis_id}/scenarios", json=scen_payload)
        assert duplicate.status_code == 409, f"Expected 409 Conflict, got {duplicate.status_code}: {duplicate.text}"
        assert "already exists" in duplicate.json()["detail"]

        # Duplicate creation with auto_id=true must succeed and generate a unique ID
        auto_unique = client.post(f"/api/analyses/{analysis_id}/scenarios?auto_id=true", json=scen_payload)
        assert auto_unique.status_code == 200
        assert auto_unique.json()["scenario_id"] == "test_collision_id_2"

    def test_report_limitations_explicit_source_type_branches(self):
        """Report limitations must never describe local_fixture data as MERRA-2 or historical reanalysis."""
        # 1. Create analysis using local fixture
        res_fix = client.post(
            "/api/analyses?force_fixture=true",
            json={
                "location_name": "San Francisco, CA",
                "latitude": 37.7749,
                "longitude": -122.4194,
                "start_date": "2019-01-01",
                "end_date": "2019-12-31",
                "system_capacity_kw": 5.0,
            },
        )
        assert res_fix.status_code == 201
        fix_id = res_fix.json()["analysis_id"]

        rep_fix = client.get(f"/api/analyses/{fix_id}/report")
        assert rep_fix.status_code == 200
        limits_fix = rep_fix.json()["model_limitations"]

        # Must contain synthetic fixture notice and NOT claim verified MERRA-2 weather reanalysis
        assert any("Synthetic Benchmark Fixture Notice" in lim for lim in limits_fix)
        assert not any("Weather Reanalysis Data (MERRA-2) Notice" in lim for lim in limits_fix)

        # 2. Create analysis using clear-sky model (Dehradun)
        res_sky = client.post(
            "/api/analyses?force_fixture=true",
            json={
                "location_name": "Dehradun, India",
                "latitude": 30.3165,
                "longitude": 78.0322,
                "start_date": "2019-01-01",
                "end_date": "2019-12-31",
                "system_capacity_kw": 5.0,
                "currency_code": "INR",
            },
        )
        assert res_sky.status_code == 201
        sky_id = res_sky.json()["analysis_id"]

        rep_sky = client.get(f"/api/analyses/{sky_id}/report")
        assert rep_sky.status_code == 200
        limits_sky = rep_sky.json()["model_limitations"]

        assert any("Theoretical Clear-Sky Model Notice" in lim for lim in limits_sky)
        assert not any("Synthetic Benchmark Fixture Notice" in lim for lim in limits_sky)
        assert not any("Weather Reanalysis Data (MERRA-2) Notice" in lim for lim in limits_sky)

    def test_config_env_loading_independent_of_cwd(self):
        """Settings must compute an absolute path for .env, decoupling configuration from CWD."""
        from backend.app.config import settings, ENV_PATH

        assert ENV_PATH.is_absolute()
        assert ENV_PATH.name == ".env"
        assert settings.MAX_CONCURRENT_SIMULATIONS == 20
        assert settings.MAX_ANALYSES_CAPACITY == 100
        assert settings.MAX_SIMULATION_DAYS == 366


