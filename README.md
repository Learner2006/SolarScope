# SolarScope — Solar Feasibility & Scenario Analysis Engine

> High-precision, interactive solar feasibility, time-series generation modeling, financial payback calculation, and baseline-isolated sensitivity analysis.

[![Backend Tests](https://img.shields.io/badge/backend%20tests-64%20passed-emerald)](https://github.com)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-44%20passed-emerald)](https://github.com)
[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

---

## 1. Product Vision & Principles

SolarScope allows engineers, analysts, and project owners to investigate site-level solar feasibility through a traceable analytical workflow:

$$\text{Landing} \longrightarrow \text{Define Scope} \longrightarrow \text{Execute Feasibility} \longrightarrow \text{Inspect Dashboard} \longrightarrow \text{Run Scenarios} \longrightarrow \text{Compare Results} \longrightarrow \text{Export Report}$$

### Core Engineering Principles
1. **No Fabricated Results**: Every metric originates from verified atmospheric reanalysis time-series, explicit user parameters, or tested formulas.
2. **Zero Arbitrary LLM Dependency**: Core preset scenarios and calculations operate deterministically.
3. **Correctness Before Polish**: Dynamic period duration (accounts for leap years e.g. 8,784h vs 8,760h) and verified edge-case division safety.
4. **Baseline Isolation**: Running a scenario evaluates sensitivity without mutating the baseline analysis run.
5. **Traceable Provenance**: Full attribution to Renewables.ninja / MERRA-2 under CC BY-NC 4.0.

---

## 2. Repository Layout

```text
solarscope/
├── README.md
├── .env.example
├── .gitignore
├── .editorconfig
├── docs/
│   ├── architecture.md
│   ├── methodology.md
│   ├── data-provenance.md
│   ├── assumptions-and-limitations.md
│   └── api-contracts.md
├── backend/
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── domain/               # Pure calculation engine: time_series, generation, financials, scenarios
│   │   ├── services/             # renewables_ninja, generation_service, analysis_service, scenario_service
│   │   ├── api/routes/           # health, simulations, analyses, scenarios, reports
│   │   ├── api/schemas/          # Pydantic request/response contracts
│   │   ├── repositories/         # Thread-safe in-memory session persistence
│   │   └── data/fixtures/        # Deterministic 8,760-hour benchmark fixture
│   └── tests/                    # 80 pytest unit, integration, and physics regression tests
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── routes/               # Landing, Scope, Analysis, Scenarios, Report, Methodology
│       ├── components/           # ScopeForm, Charts (Monthly & Hourly), ScenarioControls, ReportDocument
│       ├── state/                # AnalysisProvider context
│       ├── services/             # Typed API client
│       ├── styles/               # tokens.css, global.css, layout.css, print.css
│       └── tests/                # 48 Vitest unit, component, and integration tests
└── scripts/
    ├── dev.sh                    # Starts both FastAPI and Vite servers concurrently
    └── check.sh                  # Runs complete backend, frontend, and build verification
```

---

## 3. Quick Start & Setup

### Prerequisites
- Python 3.9+ (Python 3.12 recommended)
- Node.js 18+ and npm

### 1. Clone & Configure Environment
```bash
git clone <repo-url>
cd SolarScope

# Create environment file from template
cp .env.example .env
```

If you have a Renewables.ninja API token, edit `.env`:
```ini
RENEWABLES_NINJA_TOKEN=your_token_here
```
*(If left blank, SolarScope operates cleanly in local development fixture mode with zero setup blockers).*

### 2. Backend Setup
```bash
cd backend
python3 -m pip install -r requirements.txt
cd ..
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

---

## 4. Running the Application

### Option A: All-in-one Development Script
```bash
./scripts/dev.sh
```
- Frontend: `http://localhost:5173`
- Backend API: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### Option B: Separate Terminals
```bash
# Terminal 1: Backend
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 5. Verification & Testing

To run the entire verification suite in one command:
```bash
./scripts/check.sh
```

### Running Backend Tests Separately
```bash
python3 -m pytest backend/tests
```
- Tests calendar period arithmetic (8,760h vs 8,784h leap year).
- Verifies independent financial calculations against hand-derived values.
- Verifies edge cases: zero generation, zero initial cost, negative net benefit, division by zero protection.
- Verifies baseline immutability during scenario runs.
- Verifies FastAPI route contracts and validation rejections.

### Running Frontend Tests Separately
```bash
cd frontend
npm run test
```
- Verifies scope input validation boundaries.
- Verifies currency and percentage formatting.
- Verifies report document component rendering.

---

## 6. Formulas Implemented

| Quantity | Formula |
| :--- | :--- |
| **Actual Period Duration ($H$)** | $[(\text{End Date} - \text{Start Date}) + 1] \times 24\text{ hours}$ |
| **Capacity Factor ($\text{CF}$)** | $\frac{\sum E_t}{P_{\text{rated}} \times H} \times 100\%$ |
| **Self-Consumed Energy ($E_{\text{self}}$)** | $E_{\text{total}} \times (\text{Self-Consumption } \% / 100)$ |
| **Grid-Exported Energy ($E_{\text{export}}$)** | $E_{\text{total}} - E_{\text{self}}$ |
| **Gross Annual Savings** | $(E_{\text{self}} \times T_{\text{import}}) + (E_{\text{export}} \times T_{\text{export}})$ |
| **Net Annual Benefit** | $\text{Gross Annual Savings} - \text{Annual Maintenance Cost}$ |
| **Simple Payback** | $\frac{\text{Installation Cost}}{\text{Net Annual Benefit}} \quad (\text{if Net Benefit } > 0)$ |
| **25-Yr Lifetime Return** | $(\text{Net Annual Benefit} \times \text{Lifetime}) - \text{Installation Cost}$ |
| **LCOE** | $\frac{\text{Installation Cost} + (\text{Annual Maintenance Cost} \times \text{Lifetime})}{E_{\text{total}} \times \text{Lifetime}}$ |

---

## 7. Data Provenance & Source Separation

SolarScope implements three distinct simulation pathways, strictly separated in code and labeled across all reports and UI views:

1. **Local Offline Benchmark Fixture (San Francisco 2019 baseline)**: An 8,760-hour synthetic reference dataset (1 kW, 10% loss) for repeatable offline development, regression calibration, and automated testing. It yields 901.18 kWh/kW (10.29% CF) due to embedded synthetic attenuation. It is never attributed to MERRA-2 historical satellite reanalysis.
2. **SolarScope Astronomical Clear-Sky Model**: Pure Python celestial geometry and optical air mass engine (Duffie & Beckman solar geometry, Kasten-Young 1989 air mass) providing theoretical, cloudless insolation estimates for arbitrary global coordinates without external API keys.
3. **Live Renewables.ninja API Integration**: Used strictly when `RENEWABLES_NINJA_TOKEN` is configured in `.env`, retrieving NASA MERRA-2 reanalysis under CC BY-NC 4.0:
   > **S. Pfenninger and I. Staffell (2016).** *Long-term patterns of European PV output using 30 years of validated hourly reanalysis and satellite data.* Energy, 114, 1251–1265. DOI: [10.1016/j.energy.2016.08.060](https://doi.org/10.1016/j.energy.2016.08.060).

---

## 8. Production Deployment & Secure CORS Configuration

SolarScope supports both single-domain reverse-proxy deployments and decoupled static frontend + standalone API architectures with provider-independent environment configuration.

### Environment Variables Reference

#### Backend Service Environment Variables

| Variable | Required in Prod | Default | Description |
| :--- | :---: | :--- | :--- |
| `ENVIRONMENT` | **Yes** | `development` | Set to `production` in live environments. When set to `production`, wildcard CORS origins (`*`) are strictly blocked at startup, and localhost origins/regexes are not automatically injected. |
| `BACKEND_CORS_ORIGINS` | **Yes** | `[]` (prod)<br>`localhost:*` (dev) | Comma-separated list of allowed frontend origins (e.g., `https://solarscope.example.com,https://app.solarscope.example.com`). Trailing slashes and whitespace are automatically normalized. *(Legacy alias `CORS_ORIGINS` is also supported).* |
| `RENEWABLES_NINJA_TOKEN` | *Optional* | `None` | **Backend-Only Secret**. Token for NASA MERRA-2 live satellite reanalysis. **Never expose this to frontend variables, client bundles, logs, or API responses.** If omitted, the engine uses theoretical astronomical clear-sky and benchmark fixture models. |
| `HOST` | *Optional* | `127.0.0.1` | Set to `0.0.0.0` in containerized environments (Docker, Cloud Run, Render, Fly.io). |
| `PORT` | *Optional* | `8000` | Backend listening port (many PaaS providers like Render/Railway/Fly automatically inject `$PORT`). |
| `MAX_CONCURRENT_SIMULATIONS`| *Optional* | `20` | Max simultaneous simulation runs before returning HTTP 429 concurrency throttling. |

#### Frontend Build-Time Environment Variables

| Variable | Required in Prod | Default | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | *Conditional* | `/api` | Base URL of the deployed backend API (e.g., `https://api.solarscope.example.com` or `https://backend.onrender.com`). Required when frontend and backend are hosted on separate domains/providers. Defaults to `/api` for same-domain reverse proxies and local dev Vite proxy. |

> [!IMPORTANT]
> **Vite Build-Time Baking**: `VITE_API_BASE_URL` is baked into the frontend JavaScript bundle at **build time** (`npm run build`). Always set this variable in your frontend hosting dashboard *before* triggering the deployment build.
>
> **Secret Boundary**: Vite strictly bundles variables prefixed with `VITE_`. `RENEWABLES_NINJA_TOKEN` does not use the `VITE_` prefix and is never bundled into client assets.

---

### Provider-Agnostic Hosting Guide

#### Architecture A: Decoupled Services (Recommended for Jamstack / Cloud PaaS)
*Frontend on static CDN (e.g., Vercel, Netlify, Cloudflare Pages, AWS S3/CloudFront); Backend on container/PaaS (e.g., Render, Railway, Fly.io, GCP Cloud Run, AWS App Runner).*

1. **Deploy Backend Service**:
   - Build/Docker command: `pip install -r backend/requirements.txt`
   - Start command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - Configure Backend Environment Variables in hosting dashboard:
     ```ini
     ENVIRONMENT=production
     BACKEND_CORS_ORIGINS=https://<your-frontend-domain>
     RENEWABLES_NINJA_TOKEN=<your-upstream-secret-token>  # Encrypted secret
     ```
   - Copy your assigned backend URL (e.g., `https://solarscope-api.example.com`).

2. **Deploy Frontend Service**:
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Configure Frontend Environment Variable in hosting dashboard:
     ```ini
     VITE_API_BASE_URL=https://solarscope-api.example.com
     ```
   - Trigger build. Browser preflight `OPTIONS` requests from your frontend origin will receive `200 OK` with verified `Access-Control-Allow-Origin`.

#### Architecture B: Single-Domain Unified Deployment (Reverse Proxy)
*Frontend and backend served under the same origin via Nginx, Traefik, or Caddy.*

- Reverse proxy routes `/api/*` to the internal backend (`http://backend:8000`) and all other routes to the static `dist/` directory.
- `VITE_API_BASE_URL` can be omitted (defaults to relative `/api`).
- `BACKEND_CORS_ORIGINS` can be set to the unified domain or left empty (same-origin requests do not trigger CORS preflight).

---

## 9. Deployment Architecture, Security & Archiving

### Local-Only Engineering Deployment Notice
SolarScope is architected as an offline/local engineering workstation. Multi-user authentication, tenant isolation, and session-scoped access controls are intentionally not implemented. **The application must not be exposed to public networks** without external reverse-proxy authentication (OAuth2/OIDC), TLS termination, and database-backed multi-tenant session storage.

### Safe Source Distribution Archiving
To prevent credentials (`.env`), macOS metadata (`__MACOSX`, `.DS_Store`), or build artifacts (`frontend/dist`) from being inadvertently bundled into distribution archives, use the safe archiver script:
```bash
./scripts/create_archive.sh [output_path.zip]
```
This utility uses git attributes (`.gitattributes export-ignore`) and strict exclusion patterns with automated archive content verification.
