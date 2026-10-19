"""Tests for health endpoint."""

from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_check_returns_ok():
    """Verify health endpoint returns status healthy and runtime metadata."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "renewables_ninja" in data
    assert "token_configured" in data["renewables_ninja"]
