"""Test configuration, fixtures, and shared helpers."""

import json
import os
from datetime import date
import pytest


@pytest.fixture
def sample_fixture_path() -> str:
    """Path to the benchmark 8,760-hour fixture."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "app", "data", "fixtures", "sample_pv_data.json")


@pytest.fixture
def sample_pv_data(sample_fixture_path: str) -> dict:
    """Load benchmark PV fixture JSON."""
    with open(sample_fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def standard_dates() -> tuple[date, date]:
    """Standard 1-year test dates."""
    return date(2019, 1, 1), date(2019, 12, 31)


@pytest.fixture
def leap_year_dates() -> tuple[date, date]:
    """Full leap year dates (2020)."""
    return date(2020, 1, 1), date(2020, 12, 31)
