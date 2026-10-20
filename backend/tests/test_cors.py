"""Tests for CORS configuration, origins enforcement, and preflight OPTIONS handling."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.app.config import Settings
from backend.app.main import app, create_app


def test_cors_dev_default_localhost_allowed_preflight():
    """Verify that in development mode, localhost origins are allowed for preflight OPTIONS requests."""
    client = TestClient(app)
    
    for origin in ("http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"):
        resp = client.options(
            "/api/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        assert resp.status_code == 200, f"Expected 200 for {origin}, got {resp.status_code}"
        assert resp.headers.get("access-control-allow-origin") == origin
        assert resp.headers.get("access-control-allow-credentials") == "true"


def test_cors_dev_localhost_regex_preview_port_allowed():
    """Verify that localhost regex allows other development ports (e.g. Vite preview 4173)."""
    client = TestClient(app)
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:4173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:4173"


def test_cors_dev_disallowed_origin_preflight_rejected():
    """Verify that untrusted origins receive 400 on preflight OPTIONS and no CORS headers."""
    client = TestClient(app)
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "https://malicious-attacker.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.status_code == 400
    assert "access-control-allow-origin" not in resp.headers


def test_cors_dev_simple_get_origin_headers():
    """Verify that simple GET requests include CORS headers for allowed origins and omit them for disallowed origins."""
    client = TestClient(app)
    
    # Allowed
    resp_ok = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert resp_ok.status_code == 200
    assert resp_ok.headers.get("access-control-allow-origin") == "http://localhost:5173"

    # Disallowed
    resp_bad = client.get("/api/health", headers={"Origin": "https://unauthorized-domain.org"})
    assert resp_bad.status_code == 200
    assert "access-control-allow-origin" not in resp_bad.headers


def test_cors_production_configured_origin_allowed():
    """Verify that in production mode, explicitly configured origins are permitted."""
    prod_settings = Settings(
        ENVIRONMENT="production",
        BACKEND_CORS_ORIGINS=["https://solarscope.example.com", "https://app.solarscope.example.com"],
    )
    prod_app = create_app(prod_settings)
    client = TestClient(prod_app)

    # Preflight for configured origin
    resp = client.options(
        "/api/health",
        headers={
            "Origin": "https://solarscope.example.com",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == "https://solarscope.example.com"
    assert resp.headers.get("access-control-allow-credentials") == "true"

    # Simple GET for second configured origin
    resp_get = client.get("/api/health", headers={"Origin": "https://app.solarscope.example.com"})
    assert resp_get.headers.get("access-control-allow-origin") == "https://app.solarscope.example.com"


def test_cors_production_localhost_rejected():
    """Verify that in production mode, localhost origins are NOT automatically permitted."""
    prod_settings = Settings(
        ENVIRONMENT="production",
        BACKEND_CORS_ORIGINS=["https://solarscope.example.com"],
    )
    prod_app = create_app(prod_settings)
    client = TestClient(prod_app)

    resp = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.status_code == 400
    assert "access-control-allow-origin" not in resp.headers


def test_cors_production_wildcard_strictly_prohibited():
    """Verify that setting wildcard origin ('*') in production raises a validation error."""
    # Direct wildcard
    with pytest.raises(ValidationError) as exc_info:
        Settings(ENVIRONMENT="production", BACKEND_CORS_ORIGINS="*")
    assert "Wildcard CORS origin" in str(exc_info.value)

    # Wildcard inside list
    with pytest.raises(ValidationError) as exc_info2:
        Settings(ENVIRONMENT="production", BACKEND_CORS_ORIGINS=["https://app.com", "*"])
    assert "Wildcard CORS origin" in str(exc_info2.value)

    # Substring wildcard
    with pytest.raises(ValidationError) as exc_info3:
        Settings(ENVIRONMENT="production", BACKEND_CORS_ORIGINS=["https://*.example.com"])
    assert "Wildcard CORS origin" in str(exc_info3.value)


def test_cors_origins_parsing_comma_separated_and_slashes():
    """Verify comma-separated origins string parsing and trailing slash normalization."""
    settings_obj = Settings(
        BACKEND_CORS_ORIGINS="https://frontend.vercel.app/ , https://staging.netlify.app/ , "
    )
    assert "https://frontend.vercel.app" in settings_obj.BACKEND_CORS_ORIGINS
    assert "https://staging.netlify.app" in settings_obj.BACKEND_CORS_ORIGINS
    assert not any(o.endswith("/") for o in settings_obj.BACKEND_CORS_ORIGINS)


def test_cors_origins_json_array_parsing():
    """Verify JSON array string parsing for BACKEND_CORS_ORIGINS."""
    settings_obj = Settings(
        BACKEND_CORS_ORIGINS='["https://cdn.example.com", "https://solar.org/"]'
    )
    assert settings_obj.BACKEND_CORS_ORIGINS == ["https://cdn.example.com", "https://solar.org"]


def test_cors_origins_backwards_compatibility_alias():
    """Verify that legacy CORS_ORIGINS environment variable or argument is accepted."""
    settings_obj = Settings(CORS_ORIGINS="https://legacy-domain.com")
    assert "https://legacy-domain.com" in settings_obj.BACKEND_CORS_ORIGINS
    assert "https://legacy-domain.com" in settings_obj.CORS_ORIGINS
