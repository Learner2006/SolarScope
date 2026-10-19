# SolarScope Data Provenance & Traceability

## 1. Principles of Data Traceability

A core tenet of SolarScope is: **No fabricated numbers.** Every displayed figure must originate from one of four verified categories:
1. **Source Data**: Hourly generation retrieved from Renewables.ninja or a benchmark fixture.
2. **User Scope Inputs**: Direct inputs supplied by the user (coordinates, capacity, tilt, cost, tariffs).
3. **Explicit Assumptions**: Standard initial default values marked clearly as assumptions.
4. **Derived Metrics**: Deterministic calculations performed by the tested calculation engine.

## 2. Renewables.ninja Integration Details

- **Endpoint**: `GET https://www.renewables.ninja/api/data/pv`
- **Weather Datasets**:
  - `merra2`: Global atmospheric reanalysis from NASA (covers 1980 through ~2020).
  - `sarah2`: High-resolution satellite reanalysis (primarily Europe, Africa, parts of South America).
- **Authentication**: `Authorization: Token <api_token>`
- **Rate Limits**:
  - Registered free account: 50 requests/hour, burst limit of 1 request/second.
  - Anonymous: 5 requests/day.
- **Licence**: Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).
- **Attribution Requirement**:
  > *S. Pfenninger and I. Staffell (2016). Long-term patterns of European PV output using 30 years of validated hourly reanalysis and satellite data. Energy, 114, 1251–1265. DOI: 10.1016/j.energy.2016.08.060*

## 3. Development Benchmark Fixture

When `RENEWABLES_NINJA_TOKEN` is not set or when network access is unavailable, SolarScope automatically loads `backend/app/data/fixtures/sample_pv_data.json`:
- **Location**: San Francisco, CA (37.7749° N, -122.4194° W)
- **Year**: 2019 (8,760 continuous hourly intervals)
- **Rated Capacity**: 1.0 kW DC (fixed tilt 30°, azimuth 180°, system losses 10%)
- **Data Provenance Flag**: When using this fixture, `provenance.source_type` is set to `"local_fixture"`, `provenance.is_live_retrieval` is `false`, and the user interface explicitly tags the analysis as `● Benchmark Fixture`.
