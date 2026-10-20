"""Time-series parsing, validation, and interval aggregation."""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from dateutil import parser as dt_parser


@dataclass(frozen=True)
class TimeInterval:
    """Represents a validated single-hour generation interval."""
    timestamp: datetime
    power_kw: float
    energy_kwh: float  # In a 1-hour interval, 1 kW average power == 1 kWh energy


@dataclass(frozen=True)
class TimeSeriesValidationResult:
    """Result of time-series continuity and data-integrity validation."""
    total_intervals: int
    expected_intervals: int
    missing_intervals: int
    is_continuous: bool
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    actual_hours: float
    warnings: List[str]


def parse_timestamp(ts_raw: str | datetime) -> datetime:
    """Safely parse various datetime representations to UTC-naive datetime.

    Architectural Decision / Timezone Normalization:
    External sources (MERRA-2 JSON fixture, Renewables.ninja API) format timestamps with varying
    standards: ISO strings ('2019-01-01 00:00'), epoch milliseconds, or ISO8601 with Z offsets.
    We normalize everything to UTC-naive datetime on ingestion.
    This guarantees that internal sorting, calendar grouping, and dictionary lookups operate
    predictably without ambiguous timezone-aware vs naive comparison bugs.
    """
    if isinstance(ts_raw, datetime):
        return ts_raw.replace(tzinfo=None)
    ts_str = str(ts_raw).strip()
    # Handle numeric unix timestamps (seconds or milliseconds) returned by APIs
    if ts_str.isdigit() or (ts_str.startswith("-") and ts_str[1:].isdigit()):
        val = int(ts_str)
        if abs(val) > 1e11:  # epoch in milliseconds
            dt = datetime.utcfromtimestamp(val / 1000.0)
        else:  # epoch in seconds
            dt = datetime.utcfromtimestamp(val)
        return dt.replace(tzinfo=None)
    dt = dt_parser.parse(ts_str)
    return dt.replace(tzinfo=None)


def calculate_expected_hours(start_date: date, end_date: date) -> int:
    """Calculate the exact number of hours between start_date 00:00 and end_date 23:00 inclusive.

    Correctly handles leap years (e.g. 2020, 2024 have 8,784 hours for a full year;
    regular years have 8,760 hours; partial periods have actual days * 24 hours).
    """
    if end_date < start_date:
        raise ValueError(f"end_date ({end_date}) cannot be earlier than start_date ({start_date})")

    # Full days inclusive: (end_date - start_date).days + 1
    total_days = (end_date - start_date).days + 1
    return total_days * 24


def validate_time_series(
    raw_data: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> Tuple[List[TimeInterval], TimeSeriesValidationResult]:
    """Parse and validate raw time series data from Renewables.ninja or fixture.

    Parameters
    ----------
    raw_data : Dict[str, Any]
        Dictionary mapping timestamp string to {'electricity': float} or a float value.
    start_date : date
        Requested simulation start date.
    end_date : date
        Requested simulation end date.

    Returns
    -------
    Tuple[List[TimeInterval], TimeSeriesValidationResult]
        Parsed, chronological intervals and validation report.
    """
    expected_hours = calculate_expected_hours(start_date, end_date)
    warnings: List[str] = []

    if not raw_data:
        warnings.append("Received empty time-series dataset from data provider.")
        return [], TimeSeriesValidationResult(
            total_intervals=0,
            expected_intervals=expected_hours,
            missing_intervals=expected_hours,
            is_continuous=False,
            start_time=None,
            end_time=None,
            actual_hours=0.0,
            warnings=warnings,
        )

    # Parse and sort intervals with duplicate timestamp detection
    seen_timestamps: set[datetime] = set()
    parsed_entries: List[Tuple[datetime, float]] = []
    duplicate_count = 0

    for ts_str, val in raw_data.items():
        try:
            dt = parse_timestamp(ts_str)
            if dt in seen_timestamps:
                duplicate_count += 1
                continue
            seen_timestamps.add(dt)

            if isinstance(val, dict):
                p_val = float(val.get("electricity", 0.0))
            else:
                p_val = float(val)
            # Ensure non-negative power
            power_kw = max(0.0, p_val)
            parsed_entries.append((dt, power_kw))
        except (ValueError, TypeError) as err:
            warnings.append(f"Invalid timestamp or power value '{ts_str}': {err}")

    if duplicate_count > 0:
        warnings.append(
            f"Detected and deduplicated {duplicate_count} duplicate hourly timestamp(s) in source dataset."
        )

    parsed_entries.sort(key=lambda x: x[0])

    if not parsed_entries:
        warnings.append("No valid data intervals could be parsed.")
        return [], TimeSeriesValidationResult(
            total_intervals=0,
            expected_intervals=expected_hours,
            missing_intervals=expected_hours,
            is_continuous=False,
            start_time=None,
            end_time=None,
            actual_hours=0.0,
            warnings=warnings,
        )

    # Filter to requested date range
    start_dt = datetime.combine(start_date, datetime.min.time())
    end_dt = datetime.combine(end_date, datetime.max.time().replace(second=0, microsecond=0))

    filtered_entries = [e for e in parsed_entries if start_dt <= e[0] <= end_dt]

    intervals: List[TimeInterval] = [
        TimeInterval(
            timestamp=dt,
            power_kw=round(p, 4),
            energy_kwh=round(p * 1.0, 4),  # 1 hour interval
        )
        for dt, p in filtered_entries
    ]

    total_count = len(intervals)
    missing_count = max(0, expected_hours - total_count)
    is_continuous = (total_count == expected_hours)

    # Failure Behaviour / Data Integrity:
    # If upstream API intervals are dropped or missing, we intentionally record a warning and
    # base calculations strictly on observed intervals.
    # We never synthesize, forward-fill, or fabricate generation values, keeping the audit defensible.
    if missing_count > 0:
        pct_missing = round((missing_count / expected_hours) * 100, 1)
        warnings.append(
            f"Dataset contains {missing_count} missing hours ({pct_missing}% of expected {expected_hours} hours). "
            "Capacity factor and totals reflect observed intervals only without fabricated values."
        )

    # Check for leap year note
    if start_date.year == end_date.year and calendar.isleap(start_date.year):
        if (end_date - start_date).days >= 365:
            warnings.append(f"Analysis period covers leap year {start_date.year} (8,784 hours total).")

    val_result = TimeSeriesValidationResult(
        total_intervals=total_count,
        expected_intervals=expected_hours,
        missing_intervals=missing_count,
        is_continuous=is_continuous,
        start_time=intervals[0].timestamp if intervals else None,
        end_time=intervals[-1].timestamp if intervals else None,
        actual_hours=float(total_count),
        warnings=warnings,
    )

    return intervals, val_result
