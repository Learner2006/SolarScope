# SolarScope Fixtures

This directory contains deterministic baseline datasets used for local development, offline operation, and automated testing.

## Files

- `sample_pv_data.json`: An 8,760-hour hourly PV simulation matching the exact schema returned by `GET https://www.renewables.ninja/api/data/pv` with `format=json`.
  - **Location**: San Francisco, CA (37.7749° N, -122.4194° W)
  - **Period**: 2019-01-01 to 2019-12-31 (8,760 continuous hourly intervals)
  - **System Parameters**: 1.0 kW rated DC capacity, 30° tilt, 180° azimuth (South-facing), 10% system loss (`system_loss: 0.1`)
  - **Units**: Timestamps in UTC, power in kW (equivalent to kWh energy per 1-hour interval)

## Provenance and Usage Rules

1. **Development & Fallback**: Used when `RENEWABLES_NINJA_TOKEN` is not configured in `.env` or when external network calls are disabled in tests.
2. **Honest Labeling**: When this fixture is used, the backend explicitly sets `provenance.source = "local_fixture"`. The frontend and generated reports display this status to ensure users know results are derived from a local development benchmark rather than live reanalysis.
