# SolarScope — Solar Feasibility & Scenario Analysis Engine

> High-precision, interactive solar feasibility, time-series generation modeling, financial payback calculation, and baseline-isolated sensitivity analysis.

[![Backend Tests](https://img.shields.io/badge/backend%20tests-25%20passed-emerald)](https://github.com)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-9%20passed-emerald)](https://github.com)
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
│   └── tests/                    # 25 pytest unit and integration tests
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
│       └── tests/                # Vitest unit & component tests
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
| **Net Annual Benefit** | $\text{Gross Annual Savings} - \text{Annual O\&M Cost}$ |
| **Simple Payback** | $\frac{\text{Installation Cost}}{\text{Net Annual Benefit}} \quad (\text{if Net Benefit } > 0)$ |
| **25-Yr Lifetime Return** | $(\text{Net Annual Benefit} \times \text{Lifetime}) - \text{Installation Cost}$ |
| **LCOE** | $\frac{\text{Installation Cost} + (\text{Annual O\&M} \times \text{Lifetime})}{E_{\text{total}} \times \text{Lifetime}}$ |

---

## 7. Data Provenance & Academic Citation

Solar generation data is sourced from **Renewables.ninja** using NASA MERRA-2 satellite and atmospheric reanalysis.

Please cite:
> **S. Pfenninger and I. Staffell (2016).** *Long-term patterns of European PV output using 30 years of validated hourly reanalysis and satellite data.* Energy, 114, 1251–1265. DOI: [10.1016/j.energy.2016.08.060](https://doi.org/10.1016/j.energy.2016.08.060).

Data distributed under the Creative Commons Attribution-NonCommercial 4.0 International license (**CC BY-NC 4.0**).
