"""Renewables.ninja external HTTP API adapter with local fixture fallback."""

from __future__ import annotations

from datetime import datetime
import json
import logging
import os
from typing import Any, Dict, Optional, Tuple
from dateutil import parser as dt_parser
import anyio
import httpx
from backend.app.config import settings
from backend.app.domain.solar_model import format_coordinates, simulate_astronomical_pv

logger = logging.getLogger(__name__)

LIVE_API_ATTRIBUTION = (
    "S. Pfenninger and I. Staffell (2016). Long-term patterns of European PV output using 30 years "
    "of validated hourly reanalysis and satellite data. Energy, 114, 1251–1265. "
    "Data licensed under Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)."
)

BENCHMARK_FIXTURE_ATTRIBUTION = (
    "SolarScope Offline Synthetic Benchmark Fixture (San Francisco 2019 baseline). "
    "Deterministic synthetic reference dataset for testing and offline development; "
    "does not represent verified MERRA-2 historical satellite reanalysis."
)

ASTRONOMICAL_ATTRIBUTION = (
    "SolarScope Theoretical Solar Model (Duffie & Beckman solar geometry, Kasten-Young 1989 air mass). "
    "Theoretical clear-sky calculation without local historical weather/cloud reanalysis."
)


class UpstreamServiceError(Exception):
    """Raised when external data provider (Renewables.ninja) fails and safe fallback is unavailable."""

    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


class RenewablesNinjaAdapter:
    """Client for Renewables.ninja PV simulation API with astronomical physics model fallback."""

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
        dataset: Optional[str] = None,
        force_fixture: bool = False,
    ) -> Tuple[Dict[str, Any], Dict[str, Any], bool]:
        """Retrieve PV simulation data from live API, local benchmark fixture, or astronomical model."""
        target_dataset = dataset or settings.DEFAULT_DATASET
        # Architectural Decision / Offline Operation:
        # We check token presence before attempting any HTTP operations.
        # When running without a token (default local developer mode), we immediately divert to
        # local execution (_load_or_simulate) rather than firing outbound network calls that will fail.
        if force_fixture or not self.is_api_configured():
            logger.info("Operating in local simulation mode for coordinates (%.4f, %.4f)", lat, lon)
            return await anyio.to_thread.run_sync(
                self._load_or_simulate, lat, lon, date_from, date_to, system_loss, tilt, azim, target_dataset
            )

        headers = {
            "Authorization": f"Token {self.api_token.strip()}",
            "User-Agent": "SolarScope-Analytical-Engine/1.0",
        }

        # Request standard 1 kW system with baseline 10% loss for consistent scaling
        params = {
            "lat": f"{lat:.4f}",
            "lon": f"{lon:.4f}",
            "date_from": date_from,
            "date_to": date_to,
            "dataset": target_dataset,
            "capacity": 1.0,
            "system_loss": "0.10",
            "tracking": 0,
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
                        "dataset_name": f"{dataset.upper()} atmospheric reanalysis (via live Renewables.ninja API)",
                        "retrieval_timestamp": datetime.utcnow().isoformat() + "Z",
                        "attribution": LIVE_API_ATTRIBUTION,
                        "coordinates_used": format_coordinates(lat, lon),
                        "is_live_retrieval": True,
                        "raw_metadata": payload.get("metadata", {}),
                    }
                    return hourly_data, retrieval_meta, True

                # Architectural Decision / Spatial Provenance Integrity:
                # We strictly forbid silent geographic data substitution on upstream API failures.
                # If a user requests solar data for Delhi, Mumbai, or London and the external API fails,
                # we must NEVER silently substitute San Francisco fixture data for that location.
                # For San Francisco requests, falling back to the San Francisco benchmark fixture with an explicit
                # warning is permissible because the geographic coordinates match. For all other locations,
                # we return a typed UpstreamServiceError to preserve data integrity and audit defensibility.
                is_sf = (abs(lat - 37.7749) < 0.05 and abs(lon - (-122.4194)) < 0.05)

                if response.status_code == 429:
                    logger.warning("Renewables.ninja rate limit exceeded (50/hr).")
                    if is_sf:
                        data, meta, _ = self._load_fixture(lat, lon, date_from, date_to, dataset)
                        meta["rate_limited"] = True
                        meta["api_warning"] = "Live API rate limit exceeded (429); loaded local San Francisco benchmark fixture."
                        return data, meta, False
                    raise UpstreamServiceError("Renewables.ninja API rate limit exceeded (50 calls/hour). Please try again later.", status_code=429)

                elif response.status_code == 401:
                    logger.warning("Renewables.ninja token invalid or unauthorized.")
                    if is_sf:
                        data, meta, _ = self._load_fixture(lat, lon, date_from, date_to, dataset)
                        meta["api_warning"] = "Invalid or unauthorized API token; loaded local San Francisco benchmark fixture."
                        return data, meta, False
                    raise UpstreamServiceError("Renewables.ninja API token is invalid or unauthorized.", status_code=502)

                else:
                    logger.error("Renewables.ninja API returned error: %s - %s", response.status_code, response.text)
                    if is_sf:
                        data, meta, _ = self._load_fixture(lat, lon, date_from, date_to, dataset)
                        meta["api_warning"] = f"Upstream API error ({response.status_code}); loaded local San Francisco benchmark fixture."
                        return data, meta, False
                    raise UpstreamServiceError(f"Renewables.ninja upstream API returned error ({response.status_code}).", status_code=502)

        except UpstreamServiceError:
            raise
        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.warning("Network error calling Renewables.ninja API: %s.", exc)
            is_sf = (abs(lat - 37.7749) < 0.05 and abs(lon - (-122.4194)) < 0.05)
            if is_sf:
                data, meta, _ = self._load_fixture(lat, lon, date_from, date_to, dataset)
                meta["api_warning"] = f"Network connection error ({type(exc).__name__}); loaded local San Francisco benchmark fixture."
                return data, meta, False
            raise UpstreamServiceError(f"Network error communicating with Renewables.ninja API: {type(exc).__name__}", status_code=504)

    def _load_fixture(
        self,
        lat: float,
        lon: float,
        date_from: str,
        date_to: str,
        dataset: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], Dict[str, Any], bool]:
        """Load the deterministic San Francisco synthetic benchmark fixture."""
        start_d = dt_parser.parse(date_from).date()
        end_d = dt_parser.parse(date_to).date()
        if start_d.year != 2019 or end_d.year != 2019:
            raise ValueError(
                f"The San Francisco benchmark fixture only covers calendar year 2019 (2019-01-01 to 2019-12-31). "
                f"Requested period: {date_from} to {date_to}. To simulate other years, configure a live API token "
                "or analyze a location supported by the astronomical clear-sky engine."
            )

        with open(self.fixture_path, "r", encoding="utf-8") as f:
            fixture_json = json.load(f)
        hourly_data = fixture_json.get("data", {})
        meta = {
            "source_type": "local_fixture",
            "dataset_name": "SolarScope Offline Synthetic Benchmark Fixture (San Francisco 2019)",
            "retrieval_timestamp": datetime.utcnow().isoformat() + "Z",
            "attribution": BENCHMARK_FIXTURE_ATTRIBUTION,
            "coordinates_used": "37.7749° N, 122.4194° W (San Francisco synthetic benchmark)",
            "is_live_retrieval": False,
            "raw_metadata": fixture_json.get("metadata", {}),
        }
        return hourly_data, meta, False

    def _load_or_simulate(
        self,
        lat: float,
        lon: float,
        date_from: str,
        date_to: str,
        system_loss: float = 0.10,
        tilt: float = 30.0,
        azim: float = 180.0,
        dataset: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], Dict[str, Any], bool]:
        """Load fixture for San Francisco or run astronomical simulation for any selected location."""
        target_dataset = dataset or settings.DEFAULT_DATASET
        # Spatial Routing & Provenance Integrity:
        # The bundled fixture contains a 2019 synthetic benchmark baseline for San Francisco (37.7749 N, 122.4194 W).
        # We intentionally restrict fixture loading to San Francisco coordinates (+/-0.05 deg).
        # For all other worldwide locations, we route to the astronomical clear-sky simulation rather than
        # misattributing San Francisco solar irradiance and diurnal patterns to distant locations.
        is_sf = (abs(lat - 37.7749) < 0.05 and abs(lon - (-122.4194)) < 0.05)
        if is_sf and os.path.exists(self.fixture_path):
            return self._load_fixture(lat, lon, date_from, date_to, target_dataset)

        # For any other user-selected location (e.g. Delhi, London, Tokyo, Sydney),
        # compute celestial solar angles, air mass, and clear-sky solar irradiance for that exact location
        start_d = dt_parser.parse(date_from).date()
        end_d = dt_parser.parse(date_to).date()

        # Standardize baseline simulation to 10% system loss, matching the fixture baseline
        hourly_data, total_kwh, count = simulate_astronomical_pv(
            latitude=lat,
            longitude=lon,
            start_date=start_d,
            end_date=end_d,
            tilt_degrees=tilt,
            azimuth_degrees=azim,
            system_loss=0.10,
        )

        meta = {
            "source_type": "solarscope_astronomical_model",
            "dataset_name": "SolarScope Clear-Sky & Astronomical Insolation Model",
            "retrieval_timestamp": datetime.utcnow().isoformat() + "Z",
            "attribution": ASTRONOMICAL_ATTRIBUTION,
            "coordinates_used": format_coordinates(lat, lon),
            "is_live_retrieval": False,
            "raw_metadata": {
                "model": "SolarScope Theoretical Astronomical & Clear-Sky Engine",
                "latitude": lat,
                "longitude": lon,
                "tilt": tilt,
                "azimuth": azim,
                "baseline_system_loss": 0.10,
                "simulated_intervals": count,
                "base_annual_kwh_per_kw": total_kwh,
            },
        }
        return hourly_data, meta, False


# Global adapter instance
ninja_adapter = RenewablesNinjaAdapter()
