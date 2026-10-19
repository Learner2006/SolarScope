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
