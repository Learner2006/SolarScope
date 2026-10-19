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
          SolarScope implements a strict unidirectional pipeline ensuring all displayed results are reproducible and verifiable:
        </p>
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8125rem",
            color: "var(--emerald-900)",
            marginBottom: "0.75rem",
          }}
        >
          User Scope → FastAPI Validation → Renewables.ninja Adapter → Time-Series Continuity Check → Generation Aggregation → Financial Engine → Typed Result Record
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          When running sensitivity scenarios, baseline generation time-series is preserved without mutation. Financial sensitivities re-evaluate economic formulas against the existing validated generation record, preventing redundant API calls while maintaining mathematical isolation.
        </p>
      </section>

      {/* 2. Solar Generation Data Provenance */}
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <ShieldCheck size={18} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>2. Solar PV Reanalysis Data Source</h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
          Simulated solar irradiance and power output are obtained from the <strong>Renewables.ninja</strong> API (`api/data/pv`), developed by researchers at Imperial College London and ETH Zurich.
        </p>
        <ul style={{ paddingLeft: "1.25rem", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <li>
            <strong>Weather Reanalysis:</strong> Employs NASA MERRA-2 and SARAH satellite datasets to simulate global horizontal irradiance (GHI), direct normal irradiance (DNI), and surface temperature.
          </li>
          <li>
            <strong>PV Modeling:</strong> Converts irradiance to DC output considering panel tilt, azimuth orientation, and temperature coefficient derating.
          </li>
          <li>
            <strong>Attribution Citation:</strong> S. Pfenninger and I. Staffell (2016). <em>Long-term patterns of European PV output using 30 years of validated hourly reanalysis and satellite data</em>. Energy, 114, 1251–1265. DOI: 10.1016/j.energy.2016.08.060.
          </li>
          <li>
            <strong>Licensing:</strong> Data is utilized under Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0).
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
            <strong>A. Actual Period Hours & Leap-Year Arithmetic:</strong>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              SolarScope calculates period hours dynamically based on actual calendar days:
              <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--emerald-800)" }}>
                Total Hours = [(End Date - Start Date) + 1] × 24 hours
              </code>
              A regular non-leap calendar year (e.g. 2019, 2021) has exactly <strong>8,760 hours</strong>. A leap year (e.g. 2020, 2024) has <strong>8,784 hours</strong>. SolarScope never hardcodes 8,760 across all years.
            </p>
          </div>

          <div>
            <strong>B. Capacity Factor (CF):</strong>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Dimensionless ratio of actual energy produced over the period to theoretical maximum energy output if operating continuously at full rated nameplate capacity:
              <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--emerald-800)" }}>
                CF (%) = [Total Generation (kWh) / (System Capacity (kW) × Actual Period Hours)] × 100%
              </code>
            </p>
          </div>

          <div>
            <strong>C. Self-Consumption & Bill Savings:</strong>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Solar generation is partitioned between on-site consumption (offsetting retail utility purchases) and surplus exported power:
              <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--emerald-800)" }}>
                E_self = E_total × Self-Consumption Ratio <br />
                E_export = E_total - E_self <br />
                Gross Savings = (E_self × Import Tariff) + (E_export × Export Tariff) <br />
                Net Annual Benefit = Gross Savings - Annual O&M Maintenance Cost
              </code>
            </p>
          </div>

          <div>
            <strong>D. Simple Payback Period:</strong>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Calculated only when Net Annual Benefit is positive ($&gt; 0$):
              <code style={{ display: "block", marginTop: "0.25rem", fontFamily: "var(--font-mono)", color: "var(--emerald-800)" }}>
                Simple Payback (years) = Turnkey Installation Cost / Net Annual Benefit
              </code>
              If Net Annual Benefit $\le 0$, the system is mathematically non-recovering, and SolarScope flags it explicitly without division errors.
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
          <li>
            <strong>Physical Feasibility vs Economic Feasibility:</strong> Favorable financial payback does not prove that a building roof can structurally bear PV dead-loads or satisfy local setback codes.
          </li>
          <li>
            <strong>Micro-Shading:</strong> Atmospheric reanalysis utilizes satellite grid cells. Site-specific obstacles such as neighboring chimneys, trees, or parapet walls must be verified by on-site shade telemetry.
          </li>
          <li>
            <strong>Load Profile Telemetry:</strong> In this version, self-consumption is parameterized by an average user ratio. Real commercial and residential facilities experience dynamic 15-minute load variances.
          </li>
          <li>
            <strong>Inverter Amortization:</strong> Most string inverters have a 10-15 year operational life and require replacement during a 25-year system lifetime. Users should account for this in the annual maintenance reserve.
          </li>
        </ul>
      </section>
    </div>
  );
};
