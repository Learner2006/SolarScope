# SolarScope API Contracts

The SolarScope backend exposes typed REST endpoints documented below and available interactively via Swagger UI at `http://127.0.0.1:8000/docs`.

---

## 1. `GET /api/health`
Returns system status and external integration mode.

### Response `200 OK`
```json
{
  "status": "healthy",
  "service": "SolarScope Analytical Engine",
  "version": "0.1.0",
  "environment": "development",
  "renewables_ninja": {
    "token_configured": false,
    "default_dataset": "merra2",
    "mode": "fixture_benchmark"
  }
}
```

---

## 2. `POST /api/analyses`
Creates an end-to-end solar feasibility analysis run.

### Query Parameters
- `force_fixture` (bool, optional, default: `false`): Force loading local benchmark fixture.

### Request Body (`ScopeInputSchema`)
```json
{
  "location_name": "San Francisco, CA",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "start_date": "2019-01-01",
  "end_date": "2019-12-31",
  "system_capacity_kw": 5.0,
  "tilt_degrees": 30.0,
  "azimuth_degrees": 180.0,
  "system_losses_pct": 10.0,
  "installation_cost": 7500.0,
  "import_tariff": 0.28,
  "export_tariff": 0.06,
  "self_consumption_pct": 65.0,
  "annual_maintenance_cost": 75.0,
  "project_lifetime_years": 25
}
```

### Response `201 Created` (`AnalysisResponse`)
```json
{
  "analysis_id": "4b684343-41bb-4f46-95aa-f2d1544a4dfc",
  "created_at": "2026-10-19T17:30:00Z",
  "scope": { ... },
  "generation": {
    "system_capacity_kw": 5.0,
    "total_generation_kwh": 4505.9,
    "total_generation_mwh": 4.506,
    "period_hours": 8760.0,
    "capacity_factor_pct": 10.29,
    "peak_power_kw": 4.09,
    "peak_timestamp": "2019-06-21T12:00:00",
    "daily_average_kwh": 12.35,
    "monthly_breakdown": [ ... ],
    "weakest_month": { ... },
    "strongest_month": { ... },
    "validation": { ... },
    "provenance": { ... },
    "hourly_profiles_by_month": { ... }
  },
  "financials": {
    "installation_cost": 7500.0,
    "import_tariff": 0.28,
    "export_tariff": 0.06,
    "gross_annual_savings": 903.0,
    "net_annual_benefit": 828.0,
    "simple_payback_years": 9.06,
    "is_payback_achievable": true,
    "payback_status": "Payback in 9.1 years",
    "lifetime_net_cash_flow": 13200.0,
    "roi_percentage": 176.0,
    "lcoe_per_kwh": 0.0832,
    "cash_flow_timeline": [ ... ],
    "warnings": []
  },
  "scenarios": {},
  "all_warnings": []
}
```

---

## 3. `GET /api/analyses/{analysis_id}`
Retrieves an existing analysis by ID.

### Response `200 OK`
Returns the `AnalysisResponse` record.

### Response `404 Not Found`
```json
{
  "detail": "Analysis with ID '...' not found."
}
```

---

## 4. `POST /api/analyses/{analysis_id}/scenarios`
Evaluates a sensitivity scenario against an existing baseline run without mutating the baseline.

### Request Body (`ScenarioRequestSchema`)
```json
{
  "scenario_id": "shading_15",
  "scenario_name": "Tree Shading Impact",
  "description": "Simulate 15% reduction in annual generation",
  "generation_pct_adjustment": -15.0,
  "installation_cost_override": null,
  "import_tariff_override": null,
  "export_tariff_override": null
}
```

### Response `200 OK` (`ScenarioResponseSchema`)
```json
{
  "scenario_id": "shading_15",
  "scenario_name": "Tree Shading Impact",
  "description": "Simulate 15% reduction in annual generation",
  "baseline_financials": { ... },
  "scenario_financials": { ... },
  "delta": {
    "generation_diff_kwh": -675.88,
    "generation_diff_pct": -15.0,
    "gross_savings_diff_usd": -135.45,
    "gross_savings_diff_pct": -15.0,
    "net_annual_benefit_diff_usd": -135.45,
    "payback_diff_years": 1.77,
    "lifetime_cash_flow_diff_usd": -3386.25,
    "lifetime_cash_flow_diff_pct": -25.6,
    "summary_message": "Under generation -15.0%, net annual savings change by $-135.45/yr, which extends payback by +1.8 years."
  },
  "warnings": []
}
```

---

## 5. `GET /api/analyses/{analysis_id}/report`
Compiles an audit-ready, reproducible report JSON payload.

### Response `200 OK` (`ReportResponse`)
Contains scope inputs, monthly generation breakdown, financial metrics, scenario comparisons, mathematical formulas, and deterministic conclusions.
