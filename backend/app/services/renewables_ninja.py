"""Renewables.ninja external HTTP API adapter with local fixture fallback."""

from __future__ import annotations

from datetime import datetime
import json
import logging
import os
from typing import Any, Dict, Optional, Tuple
import httpx
from backend.app.config import settings

logger = logging.getLogger(__name__)

ATTRIBUTION_TEXT = (
    "S. Pfenninger and I. Staffell (2016). Long-term patterns of European PV output using 30 years "
    "of validated hourly reanalysis and satellite data. Energy, 114, 1251–1265. "
    "Data licensed under Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)."
)


class RenewablesNinjaAdapter:
    """Client for Renewables.ninja PV simulation API."""

    API_BASE = "https://www.renewables.ninja/api/data/pv"

    def __init__(self, api_token: Optional[str] = None) -> None:
        self.api_token = api_token or settings.RENEWABLES_NINJA_TOKEN
        self.fixture_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data",
            "fixtures",
            "sample_pv_data.json",
        )

    def is_api_configured(self) -> bool:
        """Check whether an API token has been supplied in the environment."""
        return bool(self.api_token and self.api_token.strip())

    async def fetch_pv_data(
        self,
        lat: float,
        lon: float,
        date_from: str,
        date_to: str,
        system_loss: float = 0.10,
        tilt: float = 30.0,
        azim: float = 180.0,
        dataset: str = "merra2",
        force_fixture: bool = False,
    ) -> Tuple[Dict[str, Any], Dict[str, Any], bool]:
        """Retrieve PV simulation data from live API or development fixture.

        Returns
        -------
        Tuple[Dict[str, Any], Dict[str, Any], bool]
            (hourly_data_dict, provenance_metadata, is_live_retrieval)
        """
        if force_fixture or not self.is_api_configured():
            logger.info("Renewables.ninja token not configured or fixture requested; using deterministic local benchmark fixture.")
            return self._load_fixture(lat, lon, date_from, date_to, dataset)

        headers = {
            "Authorization": f"Token {self.api_token.strip()}",
            "User-Agent": "SolarScope-Analytical-Engine/1.0",
        }

        params = {
            "lat": f"{lat:.4f}",
            "lon": f"{lon:.4f}",
            "date_from": date_from,
            "date_to": date_to,
            "dataset": dataset,
            "capacity": 1.0,  # Request normalized 1 kW system for linear scaling
            "system_loss": f"{system_loss:.2f}",
            "tracking": 0,    # Fixed-tilt
            "tilt": f"{tilt:.1f}",
            "azim": f"{azim:.1f}",
            "format": "json",
            "header": "true",
        }

        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.get(self.API_BASE, params=params, headers=headers)

                if response.status_code == 200:
                    payload = response.json()
                    hourly_data = payload.get("data", {})
                    retrieval_meta = {
                        "source_type": "renewables_ninja_api",
                        "dataset_name": dataset,
                        "retrieval_timestamp": datetime.utcnow().isoformat() + "Z",
                        "attribution": ATTRIBUTION_TEXT,
                        "coordinates_used": f"{lat:.4f}° N, {lon:.4f}° E",
                        "is_live_retrieval": True,
                        "raw_metadata": payload.get("metadata", {}),
                    }
                    return hourly_data, retrieval_meta, True

                elif response.status_code == 429:
                    logger.warning("Renewables.ninja rate limit exceeded (50/hr). Falling back to fixture with warning.")
                    data, meta, _ = self._load_fixture(lat, lon, date_from, date_to, dataset)
                    meta["rate_limited"] = True
                    meta["api_warning"] = "Live API rate limit exceeded (429); loaded local development fixture."
                    return data, meta, False

                elif response.status_code == 401:
                    logger.warning("Renewables.ninja token invalid or unauthorized. Falling back to local fixture.")
                    data, meta, _ = self._load_fixture(lat, lon, date_from, date_to, dataset)
                    meta["api_warning"] = "Invalid or unauthorized API token; loaded local development benchmark."
                    return data, meta, False

                else:
                    logger.error("Renewables.ninja API returned error: %s - %s", response.status_code, response.text)
                    data, meta, _ = self._load_fixture(lat, lon, date_from, date_to, dataset)
                    meta["api_warning"] = f"Upstream API error ({response.status_code}); loaded local benchmark fixture."
                    return data, meta, False

        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.warning("Network error calling Renewables.ninja API: %s. Falling back to fixture.", exc)
            data, meta, _ = self._load_fixture(lat, lon, date_from, date_to, dataset)
            meta["api_warning"] = f"Network connection error ({type(exc).__name__}); loaded local benchmark fixture."
            return data, meta, False

    def _load_fixture(
        self,
        lat: float,
        lon: float,
        date_from: str,
        date_to: str,
        dataset: str,
    ) -> Tuple[Dict[str, Any], Dict[str, Any], bool]:
        """Load deterministic local benchmark fixture from disk."""
        if not os.path.exists(self.fixture_path):
            raise FileNotFoundError(f"Fixture file not found at {self.fixture_path}")

        with open(self.fixture_path, "r", encoding="utf-8") as f:
            fixture_json = json.load(f)

        hourly_data = fixture_json.get("data", {})
        meta = {
            "source_type": "local_fixture",
            "dataset_name": dataset,
            "retrieval_timestamp": datetime.utcnow().isoformat() + "Z",
            "attribution": ATTRIBUTION_TEXT,
            "coordinates_used": f"{lat:.4f}° N, {lon:.4f}° E (benchmark: San Francisco 37.7749° N, -122.4194° W)",
            "is_live_retrieval": False,
            "raw_metadata": fixture_json.get("metadata", {}),
        }
        return hourly_data, meta, False


# Global adapter instance
ninja_adapter = RenewablesNinjaAdapter()
