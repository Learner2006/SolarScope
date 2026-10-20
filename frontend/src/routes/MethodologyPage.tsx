import React from "react";
import { useAnalysis } from "../state/AnalysisContext";
import { ArrowLeft, BookOpen, ShieldCheck, Calculator, AlertTriangle, Layers } from "lucide-react";

export const MethodologyPage: React.FC = () => {
  const { navigateTo, currentAnalysis } = useAnalysis();

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", paddingBottom: "3rem" }}>
      <button
        onClick={() => navigateTo(currentAnalysis ? "analysis" : "scope")}
        className="btn btn-subtle"
        style={{ padding: "0.25rem 0", marginBottom: "1rem", fontSize: "0.8125rem" }}
      >
        <ArrowLeft size={14} /> Back to {currentAnalysis ? "Dashboard" : "Scope"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
        <BookOpen size={28} color="var(--emerald-600)" />
        <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Methodology & Architecture</h1>
      </div>
      <p style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "2rem" }}>
        Detailed engineering documentation of data acquisition, time-series aggregation, mathematical formulas, and analytical limitations.
      </p>

      {/* 1. Workflow Architecture */}
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Layers size={18} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>1. Data Flow & Execution Pipeline</h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
          SolarScope implements a strict unidirectional pipeline with two explicit data-acquisition pathways that converge into unified validation, aggregation, and financial engines:
        </p>
        <div
          style={{
            padding: "1rem",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.775rem",
            color: "var(--emerald-900)",
            lineHeight: 1.5,
            marginBottom: "0.75rem",
            whiteSpace: "pre-wrap",
            overflowX: "auto",
          }}
        >
{`User Scope Definition (Coordinates, Date Range, Hardware, Financials)
       │
       ▼
FastAPI Schema Validation & Boundary Constraints
       │
       ├─────────────────────────────────────────┐
       ▼                                         ▼
[Pathway A: Historical Reanalysis & Fixture] [Pathway B: Astronomical Model]
• San Francisco 2019 synthetic fixture       • Global city coordinate resolution
  OR live Renewables.ninja API (if token)   • Celestial geometry (sun angles)
• Hourly solar generation time-series       • Optical air mass clear-sky irradiance
• Empirical reanalysis (live API only)      • No historical cloud/weather reanalysis
       │                                         │
       └────────────────────┬────────────────────┘
                            │
                            ▼
           Time-Series Interval & Continuity Validation
           (Hourly sorting, deduplication, expected hours check)
                            │
                            ▼
           Generation Scaling & Calendar Aggregation
           (Capacity scaling, losses derate, monthly breakdown)
                            │
                            ▼
           Financial Feasibility & Payback Engine
           (Self-consumption, tariffs, payback, ROI, LCOE)
                            │
                            ▼
           Typed Analytical Result Record & Repository Storage
           (In-memory persistence, reproducible report audit)`}
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          When evaluating sensitivity scenarios, the baseline generation time-series is preserved without mutation. Economic sensitivities re-evaluate financial formulas against the existing validated generation record, ensuring parameter isolation and reproducible mathematical outcomes.
        </p>
      </section>

      {/* 2. Solar Generation Data Provenance */}
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <ShieldCheck size={18} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>2. Data Sources & Provenance</h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
          SolarScope strictly separates historical weather reanalysis from theoretical clear-sky modeling:
        </p>
        <ul style={{ paddingLeft: "1.25rem", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <li style={{ marginBottom: "0.75rem" }}>
            <strong>Offline Synthetic Benchmark Fixture (San Francisco, CA):</strong> For offline development, calibration, and reproducible testing, SolarScope bundles an 8,760-hour synthetic baseline dataset for San Francisco (calendar year 2019, 37.7749° N, 122.4194° W) formatted to the Renewables.ninja API schema (1 kW system, 10% baseline system loss). It serves as a deterministic reference dataset and does not represent verified MERRA-2 historical satellite reanalysis.
          </li>
          <li style={{ marginBottom: "0.75rem" }}>
            <strong>Live Renewables.ninja API Integration:</strong> An external adapter (<code style={{ fontFamily: "var(--font-mono)" }}>RenewablesNinjaAdapter</code>) connects to the Renewables.ninja HTTP API to retrieve satellite reanalysis. This live pathway is executed <strong>only when an optional <code style={{ fontFamily: "var(--font-mono)" }}>RENEWABLES_NINJA_TOKEN</code> environment variable is explicitly configured</strong>. In default local operation, no live network requests are made.
            <br />
            <em>Citation:</em> S. Pfenninger and I. Staffell (2016). <em>Long-term patterns of European PV output using 30 years of validated hourly reanalysis and satellite data.</em> Energy, 114, 1251–1265. CC BY-NC 4.0 license.
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <strong>SolarScope Astronomical Clear-Sky Model (Offline Global Cities):</strong> When running in local offline mode for coordinates outside San Francisco, SolarScope computes celestial geometry and clear-sky solar insolation directly:
            <ul style={{ paddingLeft: "1.25rem", marginTop: "0.25rem" }}>
              <li>
                <em>Celestial Geometry (Solar Declination, Hour Angle, Elevation, Tilt Incidence):</em> Informed by standard solar positioning equations presented in J. A. Duffie and W. A. Beckman (2013), <em>Solar Engineering of Thermal Processes</em>, 4th ed., Wiley.
              </li>
              <li>
                <em>Atmospheric Optical Air Mass:</em> Calculated using the empirical formulation from F. Kasten and A. T. Young (1989), <em>Revised optical air mass tables and approximation formula</em>, Applied Optics, 28(22), 4735–4738.
              </li>
            </ul>
          </li>
          <li>
            <em>Scope of Academic Citations:</em> Literature citations identify the specific published formulas adapted in the codebase. Citing Duffie & Beckman or Kasten & Young does not imply that those authors have reviewed, validated, or endorsed this software implementation, its empirical clarity factors, or its balance-of-system loss assumptions.
          </li>
        </ul>
      </section>

      {/* 3. Mathematical Formulas */}
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Calculator size={18} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>3. Core Mathematical Calculations</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.875rem" }}>
          <div>
            <strong>A. Analysis Period Hours, Inclusive Dates & Timestamps:</strong>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Start and end dates are evaluated <strong>inclusively</strong>: from 00:00:00 on the start date through 23:59:00 on the end date. Period hours are calculated directly from calendar duration:
              <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--emerald-800)" }}>
                Total Hours = [(End Date - Start Date).days + 1] × 24 hours
              </code>
              <strong>Timestamps:</strong> Timestamps in the MERRA-2 fixture and Renewables.ninja API are standard <strong>UTC timestamps</strong>. In the astronomical model, intervals step hourly in UTC time, and local solar hour is approximated from longitude (<code style={{ fontFamily: "var(--font-mono)" }}>offset = longitude / 15.0°</code>).
              <br />
              <strong>Calendar & Leap-Year Arithmetic:</strong>
              <br />
              • Standard calendar year (e.g. 2019, 2021): 365 days = exactly <strong>8,760 hours</strong>. February has 28 days (672 hours).
              <br />
              • Leap calendar year (e.g. 2020, 2024): 366 days = exactly <strong>8,784 hours</strong>. February has 29 days (696 hours).
              <br />
              • Partial period (e.g. Jan 1 – Jan 31): 31 days inclusive × 24 = <strong>744 hours</strong>.
            </p>
          </div>

          <div>
            <strong>B. Capacity Factor (CF) & Daily Averages:</strong>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Capacity factor is the dimensionless ratio of modeled electrical energy generated to the theoretical energy produced if running continuously at full rated nameplate capacity:
              <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--emerald-800)" }}>
                CF_period (%) = [Total Generation (kWh) / (System Capacity (kW) × Actual Period Modeled Hours)] × 100% <br />
                CF_month (%) = [Monthly Generation (kWh) / (System Capacity (kW) × Actual Modeled Hours in Month)] × 100% <br />
                Daily Average_month (kWh/d) = Monthly Generation (kWh) / Actual Calendar Days in Month
              </code>
              Monthly capacity factor uses the exact number of modeled hours in each calendar month (e.g., 672 hours for February 2019, 696 hours for February 2020 leap year). Monthly daily averages use the exact calendar days (28, 29, 30, or 31). Values are rounded only for presentation.
            </p>
          </div>

          <div>
            <strong>C. Energy Allocation, Tariffs & Bill Savings:</strong>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Modeled generation is partitioned between on-site consumption and surplus exported power:
              <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--emerald-800)" }}>
                E_self (kWh) = Total Generation × (Self-Consumption Ratio % / 100) <br />
                E_export (kWh) = Total Generation - E_self <br />
                Avoided Import Savings = E_self × Retail Import Electricity Tariff (currency/kWh) <br />
                Export Revenue = E_export × Grid Export Tariff (currency/kWh) <br />
                Gross Annual Savings = Avoided Import Savings + Export Revenue <br />
                Net Annual Benefit = Gross Annual Savings - Annual Maintenance Cost (O&M)
              </code>
            </p>
          </div>

          <div>
            <strong>D. Simple Payback Period:</strong>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Calculated only when Net Annual Benefit is positive (&gt; 0):
              <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--emerald-800)" }}>
                Simple Payback (years) = Turnkey Installation Capital Cost / Net Annual Benefit
              </code>
              If Net Annual Benefit &le; 0, the system is mathematically non-recovering, and SolarScope flags it explicitly as "Non-recovering" without division-by-zero errors. Payback is dimensionless with respect to currency (cost and benefit must use the same unit of account).
            </p>
          </div>

          <div>
            <strong>E. Lifetime Cash Flow, Undiscounted ROI & LCOE:</strong>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Financial metrics are evaluated across the configured project operational lifetime (typically 20–30 years):
              <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--emerald-800)" }}>
                Lifetime Total Generation (kWh) = Annual Generation (kWh/yr) × Project Lifetime Years <br />
                Lifetime Net Profit = (Net Annual Benefit × Project Lifetime Years) - Turnkey Installation Cost <br />
                Undiscounted ROI (%) = (Lifetime Net Profit / Turnkey Installation Cost) × 100% <br />
                Levelized Cost (LCOE) = [Installation Cost + (Annual Maintenance × Lifetime Years)] / Lifetime Total Generation (kWh)
              </code>
              SolarScope explicitly identifies LCOE and ROI as <strong>undiscounted nominal figures</strong>. Lifetime calculations assume constant annual generation, flat nominal tariffs, 0% panel degradation, and 0% discount rate.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Honest Limitations */}
      <section className="card" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <AlertTriangle size={18} color="var(--amber-500)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>4. Honest Model Limitations</h2>
        </div>
        <ul style={{ paddingLeft: "1.25rem", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <li style={{ marginBottom: "0.5rem" }}>
            <strong>Theoretical Clear-Sky vs Weather Reanalysis:</strong> The offline theoretical clear-sky model calculates celestial geometry and optical air mass clear-sky irradiance. It represents ideal clear-sky potential and does <strong>not</strong> model historical local cloud cover, aerosols, monsoons, or localized microclimates.
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <strong>Physical & Structural Feasibility vs Economic Feasibility:</strong> Favorable modeled economic payback does not prove that a building roof can structurally bear PV dead-loads, satisfy wind-uplift codes, comply with fire setbacks, or interface with existing electrical service panel capacity.
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <strong>Fixed Self-Consumption Ratio:</strong> Self-consumption is parameterized by a user-defined static ratio. Real-world residential and commercial facilities experience dynamic, non-coincident hourly load variances.
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <strong>Omission of Degradation, Discounting & Inflation:</strong> Lifetime cash flows, ROI, and LCOE are undiscounted nominal values that assume constant annual generation across the project operational life (omitting annual panel degradation of typically ~0.5%/yr, inflation escalation, and cost-of-capital discounting).
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <strong>Yield Comparability & Synthetic Attenuation:</strong> The offline San Francisco benchmark fixture yields 901 kWh/yr per kW (10.3% capacity factor, peak 0.606 kW) due to embedded synthetic overcast attenuation. Conversely, the clear-sky astronomical model calculates celestial geometry under ideal zero-cloud conditions, yielding 1,553 kWh/yr per kW (17.7% capacity factor, peak ~0.89 kW). Clear-sky financial metrics represent theoretical weather-unadjusted upper bounds and do not model historical cloud cover or precipitation.
          </li>
          <li style={{ marginBottom: "0.5rem" }}>
            <strong>Inverter Replacement & Balance of System:</strong> Most string inverters have a 10–15 year operational lifespan and require replacement during a 20–30 year project lifecycle. Inverter replacement capital costs are not amortized separately unless factored into the user's annual maintenance reserve.
          </li>
          <li>
            <strong>Local-Only Engineering Deployment:</strong> SolarScope is architected as an offline/local engineering workstation. Multi-user authentication, tenant isolation, and session-scoped access controls are intentionally not implemented. The application must not be exposed to public networks without external authentication, TLS termination, and database-backed multi-tenant isolation.
          </li>
        </ul>
      </section>
    </div>
  );
};
