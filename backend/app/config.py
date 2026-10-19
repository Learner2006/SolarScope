"""Application configuration using Pydantic Settings."""

from __future__ import annotations

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """SolarScope backend runtime configuration."""
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    RENEWABLES_NINJA_TOKEN: Optional[str] = None
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    DEFAULT_DATASET: str = "merra2"
    REQUEST_TIMEOUT_SECONDS: int = 30
    MAX_SIMULATION_DAYS: int = 366


# Global cached settings instance
settings = Settings()
