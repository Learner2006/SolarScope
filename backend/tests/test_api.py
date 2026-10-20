"""Tests for FastAPI endpoints: simulations, analyses, scenarios, reports, and error validation."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


@pytest.fixture
def valid_scope_payload() -> dict:
    """Standard valid payload for scope analysis."""
    return {
        "location_name": "San Francisco Test Site",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "start_date": "2019-01-01",
        "end_date": "2019-12-31",
        "system_capacity_kw": 6.0,
        "tilt_degrees": 30.0,
        "azimuth_degrees": 180.0,
        "system_losses_pct": 10.0,
        "installation_cost": 8500.0,
        "import_tariff": 0.26,
        "export_tariff": 0.05,
        "self_consumption_pct": 60.0,
        "annual_maintenance_cost": 90.0,
        "project_lifetime_years": 25,
    }


def test_create_analysis_success(valid_scope_payload):
    """Verify POST /api/analyses creates a valid analysis run with 201 status."""
    response = client.post("/api/analyses?force_fixture=true", json=valid_scope_payload)
    assert response.status_code == 201
    data = response.json()

    assert "analysis_id" in data
    assert data["generation"]["system_capacity_kw"] == 6.0
    assert data["generation"]["total_generation_kwh"] > 0
    assert data["financials"]["gross_annual_savings"] > 0
    assert len(data["generation"]["monthly_breakdown"]) == 12
    assert data["generation"]["provenance"]["source_type"] == "local_fixture"


def test_get_analysis_by_id(valid_scope_payload):
    """Verify GET /api/analyses/{id} retrieves the exact created analysis."""
    create_res = client.post("/api/analyses?force_fixture=true", json=valid_scope_payload)
    analysis_id = create_res.json()["analysis_id"]

    get_res = client.get(f"/api/analyses/{analysis_id}")
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["analysis_id"] == analysis_id
    assert retrieved["scope"]["system_capacity_kw"] == 6.0


def test_get_analysis_not_found():
    """Verify 404 response when querying non-existent analysis ID."""
    response = client.get("/api/analyses/non-existent-uuid-12345")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_scenario_creation_and_deltas(valid_scope_payload):
    """Verify POST /api/analyses/{id}/scenarios evaluates sensitivity and calculates deltas."""
    create_res = client.post("/api/analyses?force_fixture=true", json=valid_scope_payload)
    analysis_id = create_res.json()["analysis_id"]

    scenario_req = {
        "scenario_id": "shading_15",
        "scenario_name": "Tree Shading Impact",
        "description": "Simulating a 15% reduction in annual solar irradiance due to seasonal shading",
        "generation_pct_adjustment": -15.0,
    }

    scen_res = client.post(f"/api/analyses/{analysis_id}/scenarios", json=scenario_req)
    assert scen_res.status_code == 200
    scen_data = scen_res.json()

    assert scen_data["scenario_id"] == "shading_15"
    assert scen_data["delta"]["generation_diff_pct"] == -15.0
    assert scen_data["delta"]["gross_savings_diff_usd"] < 0
    assert scen_data["delta"]["payback_diff_years"] > 0


def test_report_endpoint(valid_scope_payload):
    """Verify GET /api/analyses/{id}/report returns structured audit documentation."""
    create_res = client.post("/api/analyses?force_fixture=true", json=valid_scope_payload)
    analysis_id = create_res.json()["analysis_id"]

    # Also add a scenario to check inclusion in report
    scenario_req = {
        "scenario_id": "cost_cut",
        "scenario_name": "Incentive Discount (-$1,500)",
        "description": "State rebate applied",
        "installation_cost_override": 7000.0,
    }
    client.post(f"/api/analyses/{analysis_id}/scenarios", json=scenario_req)

    report_res = client.get(f"/api/analyses/{analysis_id}/report")
    assert report_res.status_code == 200
    report_data = report_res.json()

    assert report_data["analysis_id"] == analysis_id
    assert len(report_data["scenarios"]) == 1
    assert "Capacity Factor (CF)" in report_data["formulas_and_methodology"]
    assert len(report_data["model_limitations"]) > 0
    assert len(report_data["conclusions"]) > 0

    # Verify cautious conclusion wording (replaces 'Economic feasibility confirmed')
    assert any("Under the stated financial assumptions, the modeled simple payback is approximately" in c for c in report_data["conclusions"])
    assert not any("Economic feasibility confirmed" in c for c in report_data["conclusions"])

    # Verify canonical LCOE matches exact undiscounted formula
    fin = report_data["financials"]
    expected_lifetime_cost = fin["installation_cost"] + (fin["annual_maintenance_cost"] * fin["project_lifetime_years"])
    expected_lifetime_gen = fin["total_generation_kwh"] * fin["project_lifetime_years"]
    expected_lcoe = round(expected_lifetime_cost / expected_lifetime_gen, 4)
    assert fin["lcoe_per_kwh"] == expected_lcoe


def test_validation_error_invalid_dates():
    """Verify Pydantic validation rejects end_date preceding start_date with 422."""
    bad_payload = {
        "latitude": 37.77,
        "longitude": -122.42,
        "start_date": "2020-12-31",
        "end_date": "2020-01-01",  # Invalid order
        "system_capacity_kw": 5.0,
    }
    response = client.post("/api/analyses", json=bad_payload)
    assert response.status_code == 422


def test_validation_error_negative_cost():
    """Verify Pydantic validation rejects negative installation cost."""
    bad_payload = {
        "latitude": 37.77,
        "longitude": -122.42,
        "start_date": "2020-01-01",
        "end_date": "2020-01-31",
        "system_capacity_kw": 5.0,
        "installation_cost": -500.0,  # Negative
    }
    response = client.post("/api/analyses", json=bad_payload)
    assert response.status_code == 422


def test_dehradun_astronomical_model_separation():
    """Verify that selecting Dehradun runs the astronomical model and does NOT substitute the SF fixture."""
    dehradun_payload = {
        "location_name": "Dehradun, India",
        "latitude": 30.3165,
        "longitude": 78.0322,
        "start_date": "2019-01-01",
        "end_date": "2019-12-31",
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
    }
    response = client.post("/api/analyses?force_fixture=true", json=dehradun_payload)
    assert response.status_code == 201
    data = response.json()

    # Provenance must be the astronomical model, NOT local_fixture
    prov = data["generation"]["provenance"]
    assert prov["source_type"] == "solarscope_astronomical_model"
    assert "Clear-Sky" in prov["dataset_name"]
    assert "30.3165° N" in prov["coordinates_used"]
    assert "San Francisco" not in prov["coordinates_used"]

    # Warnings must explicitly state this is a clear-sky theoretical estimate
    warnings = data["all_warnings"]
    assert any("Theoretical Model Notice" in w or "clear-sky" in w.lower() for w in warnings)

    # Report verification
    analysis_id = data["analysis_id"]
    report_res = client.get(f"/api/analyses/{analysis_id}/report")
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert any("Theoretical Clear-Sky" in lim for lim in report_data["model_limitations"])


def test_san_francisco_benchmark_fixture_retention():
    """Verify that San Francisco retains the offline benchmark fixture with honest labeling."""
    sf_payload = {
        "location_name": "San Francisco, CA",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "start_date": "2019-01-01",
        "end_date": "2019-12-31",
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
    }
    response = client.post("/api/analyses?force_fixture=true", json=sf_payload)
    assert response.status_code == 201
    data = response.json()

    prov = data["generation"]["provenance"]
    assert prov["source_type"] == "local_fixture"
    assert "Benchmark Fixture" in prov["dataset_name"]
    assert "San Francisco" in prov["coordinates_used"]
    assert "Synthetic Benchmark" in prov["attribution"]


def test_currency_selection_invariance_on_generation():
    """Verify changing financial currency (e.g. to INR) does not alter physical solar simulation."""
    delhi_base = {
        "location_name": "Delhi, India",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "start_date": "2019-01-01",
        "end_date": "2019-12-31",
        "system_capacity_kw": 5.0,
        "tilt_degrees": 28.0,
        "azimuth_degrees": 180.0,
        "system_losses_pct": 10.0,
        "installation_cost": 7500.0,
        "import_tariff": 0.28,
        "export_tariff": 0.06,
        "self_consumption_pct": 65.0,
        "annual_maintenance_cost": 75.0,
        "project_lifetime_years": 25,
    }

    # 1. Run in default USD
    res_usd = client.post("/api/analyses?force_fixture=true", json={**delhi_base, "currency_code": "USD"})
    assert res_usd.status_code == 201
    data_usd = res_usd.json()

    # 2. Run identical physical setup in INR
    res_inr = client.post("/api/analyses?force_fixture=true", json={**delhi_base, "currency_code": "INR"})
    assert res_inr.status_code == 201
    data_inr = res_inr.json()

    # Generation is strictly identical
    assert data_usd["generation"]["total_generation_kwh"] == data_inr["generation"]["total_generation_kwh"]
    assert data_usd["generation"]["capacity_factor_pct"] == data_inr["generation"]["capacity_factor_pct"]
    assert data_usd["generation"]["peak_power_kw"] == data_inr["generation"]["peak_power_kw"]

    # Currency code is correctly set without automatic unit conversion
    assert data_usd["financials"]["currency_code"] == "USD"
    assert data_inr["financials"]["currency_code"] == "INR"
    assert data_usd["financials"]["gross_annual_savings"] == data_inr["financials"]["gross_annual_savings"]


