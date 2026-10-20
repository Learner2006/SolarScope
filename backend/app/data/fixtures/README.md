# SolarScope Fixtures

This directory contains deterministic baseline datasets used for local development, offline operation, and automated testing.

## Files

- `sample_pv_data.json`: An 8,760-hour hourly PV simulation matching the exact schema returned by `GET https://www.renewables.ninja/api/data/pv` with `format=json`.
  - **Location**: San Francisco, CA (37.7749° N, 122.4194° W)
  - **Period**: 2019-01-01 to 2019-12-31 (8,760 continuous hourly intervals)
  - **System Parameters**: 1.0 kW rated DC capacity, 30° tilt, 180° azimuth (South-facing), 10% system loss (`system_loss: 0.1`)
  - **Units**: Timestamps in UTC, power in kW (equivalent to kWh energy per 1-hour interval)
  - **Annual Production**: 901.18 kWh per 1 kW system (Capacity Factor: 10.29%, Peak Power: 0.606 kW)

## Provenance, Yield Comparability, and Usage Rules

1. **Deterministic Benchmark Test Fixture**: This dataset is strictly an offline synthetic test fixture formatted to match external API response schemas for repeatable unit tests and offline UI development. It embeds an aggressive synthetic derating curve (peak power 0.606 kW), resulting in 901.18 kWh/year.
2. **Comparability against Clear-Sky Model**: By contrast, the SolarScope theoretical astronomical clear-sky model calculates celestial geometry and Kasten-Young optical air mass under continuous zero-cloud conditions, yielding 1,552.82 kWh/year (Capacity Factor: 17.73%, Peak Power: ~0.89 kW) for the same San Francisco coordinates. The ~1.72x ratio arises from the fixture's heavy attenuation factor versus the theoretical clear-sky assumption of 365 days of unshaded, cloudless sunlight. Neither dataset should be mistaken for an on-site pyranometer or historical satellite reanalysis measurement.
3. **Honest Labeling**: When this fixture is loaded, the engine explicitly reports `source_type = "local_fixture"`. Reports, UI badges, and methodology documentation describe it as a deterministic offline benchmark fixture, never as verified MERRA-2 historical reanalysis.
