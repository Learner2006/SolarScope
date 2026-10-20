"""Application configuration using Pydantic Settings."""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional, Union
from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Compute absolute path to repository root, ensuring .env loading is independent of CWD
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ENV_PATH = REPO_ROOT / ".env"

DEFAULT_DEV_CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


class Settings(BaseSettings):
    """SolarScope backend runtime configuration."""
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    RENEWABLES_NINJA_TOKEN: Optional[str] = None
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    BACKEND_CORS_ORIGINS: Union[List[str], str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("BACKEND_CORS_ORIGINS", "CORS_ORIGINS"),
        description="Allowed CORS origins: comma-separated string or list of URLs.",
    )

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(x).strip().rstrip("/") for x in parsed if str(x).strip()]
                except Exception:
                    pass
            return [x.strip().rstrip("/") for x in v.split(",") if x.strip()]
        elif isinstance(v, (list, tuple)):
            return [str(x).strip().rstrip("/") for x in v if str(x).strip()]
        return v

    @model_validator(mode="after")
    def validate_production_cors(self):
        """Enforce strict CORS security in production: reject wildcards."""
        if self.is_production:
            for origin in self.BACKEND_CORS_ORIGINS:
                if origin == "*" or "*" in origin:
                    raise ValueError(
                        f"Wildcard CORS origin '{origin}' is not permitted in production environment. "
                        "Specify explicit origin URLs (e.g. 'https://app.example.com')."
                    )
        return self

    @property
    def is_production(self) -> bool:
        """Indicates whether the application is running in production mode."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def all_cors_origins(self) -> List[str]:
        """Effective CORS origins based on environment.

        In development, localhost development ports are preserved and merged.
        In production, only explicitly configured origins are permitted;
        wildcard origins ('*') are strictly prohibited.
        """
        if self.is_production:
            return list(self.BACKEND_CORS_ORIGINS)
        combined = list(DEFAULT_DEV_CORS_ORIGINS)
        for origin in self.BACKEND_CORS_ORIGINS:
            if origin not in combined:
                combined.append(origin)
        return combined

    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Backwards compatibility alias for all_cors_origins."""
        return self.all_cors_origins

    @property
    def cors_origin_regex(self) -> Optional[str]:
        """Regex for allowed localhost origins. Only active in development."""
        if self.is_production:
            return None
        return r"https?://(localhost|127\.0\.0\.1)(:[0-9]+)?"
    DEFAULT_DATASET: str = "merra2"
    REQUEST_TIMEOUT_SECONDS: int = 30
    MAX_SIMULATION_DAYS: int = 366
    MAX_CONCURRENT_SIMULATIONS: int = 20
    MAX_ANALYSES_CAPACITY: int = 100


# Global cached settings instance
settings = Settings()
