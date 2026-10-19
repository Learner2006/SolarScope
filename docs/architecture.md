# SolarScope System Architecture

## Overview

SolarScope is an analytical solar feasibility and sensitivity-analysis platform. It is engineered with a strict separation between numerical domain logic, external data acquisition, HTTP transport, and interactive user presentation.

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (React 18 + Vite + TypeScript)"]
        UI_Scope["Screen B: ScopeForm"] --> Hook_Analysis["useAnalysis() / Context"]
        Hook_Analysis --> API_Client["services/api.ts (Fetch)"]
        API_Client --> UI_Dash["Screen D: Dashboard"]
        API_Client --> UI_Scen["Screen E: Scenarios Workspace"]
        API_Client --> UI_Rep["Screen F: Printable Report"]
    end

    subgraph Backend ["Backend (FastAPI + Python 3.9+)"]
        API_Client --> Routes["api/routes/*.py"]
        Routes --> Schemas["api/schemas/*.py (Pydantic)"]
        Routes --> Services["services/*.py"]
        
        Services --> Adapter["services/renewables_ninja.py"]
        Services --> GenService["services/generation_service.py"]
        Services --> FinService["services/analysis_service.py"]
        Services --> ScenService["services/scenario_service.py"]
        
        GenService --> Domain_TS["domain/time_series.py"]
        GenService --> Domain_Gen["domain/generation.py"]
        FinService --> Domain_Fin["domain/financials.py"]
        ScenService --> Domain_Scen["domain/scenarios.py"]
        
        FinService --> Repo["repositories/analysis_repository.py"]
    end

    subgraph External ["Data & Fixtures"]
        Adapter -->|If Token Set| RN_API["Renewables.ninja API (GET /api/data/pv)"]
        Adapter -->|Offline / No Token| Fixture["data/fixtures/sample_pv_data.json"]
    end
```

## Layer Responsibilities

1. **Domain Layer (`backend/app/domain/`)**:
   - Pure, stateless Python functions and frozen dataclasses.
   - Independent of FastAPI, HTTP libraries, and UI state.
   - Handles calendar arithmetic (leap year 8,784h vs non-leap 8,760h), time-series continuity, Capacity Factor arithmetic, self-consumption allocation, avoided-bill savings, simple payback, and lifetime cash flows.

2. **Integration & Service Layer (`backend/app/services/`)**:
   - `renewables_ninja.py`: HTTP client with rate-limiting backoff, timeouts, and seamless local benchmark fixture fallback.
   - `generation_service.py`: Orchestrates external retrieval, time-series validation, and monthly aggregations.
   - `analysis_service.py`: Glues generation to financial calculations and persists immutable runs.
   - `scenario_service.py`: Evaluates sensitivity adjustments against immutable baseline generation.
   - `report_service.py`: Compiles reproducible audit records with deterministic conclusions.

3. **API & Schemas (`backend/app/api/`)**:
   - Typed Pydantic request models with range validations.
   - Standardized REST endpoints:
     - `GET /api/health`
     - `POST /api/simulations`
     - `POST /api/analyses`
     - `GET /api/analyses/{id}`
     - `POST /api/analyses/{id}/scenarios`
     - `GET /api/analyses/{id}/report`

4. **Persistence (`backend/app/repositories/`)**:
   - Thread-safe in-memory store for session runs.
   - Decoupled via repository interface so SQL/Document persistence can be slotted in without modifying business rules.

5. **Client Application (`frontend/src/`)**:
   - React 18 with TypeScript.
   - Centralized `AnalysisProvider` context managing execution progress, current baseline, and scenario state.
   - Synchronized numeric sliders and inputs.
   - Recharts visualizations: monthly generation breakdown, 24-hour diurnal profile drill-down, and baseline vs scenario comparison.
   - Dedicated print stylesheet (`print.css`) for browser print-to-PDF report generation.
