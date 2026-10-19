import React from "react";
import { useAnalysis } from "../state/AnalysisContext";
import { ArrowRight, Sun, Shield, Sliders, FileText } from "lucide-react";

export const LandingPage: React.FC = () => {
  const { navigateTo } = useAnalysis();

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "3rem 1rem", textAlign: "center" }}>
      {/* Floating Green Energy Visual Orb */}
      <div
        className="floating-energy-orb"
        style={{
          width: "120px",
          height: "120px",
          margin: "0 auto 2.5rem",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.08) 60%, transparent 80%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 50px -10px rgba(16, 185, 129, 0.3)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
        }}
      >
        <Sun size={52} color="var(--emerald-600)" strokeWidth={1.75} />
      </div>

      <div className="badge badge-emerald" style={{ marginBottom: "1rem" }}>
        Analytical Solar Feasibility & Sensitivity Modeling
      </div>

      <h1
        style={{
          fontSize: "2.75rem",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          color: "var(--text-primary)",
          marginBottom: "1.25rem",
        }}
      >
        Transparent Solar Modeling. <br />
        <span style={{ color: "var(--emerald-600)" }}>Traceable Clean Energy Outcomes.</span>
      </h1>

      <p
        style={{
          fontSize: "1.125rem",
          color: "var(--text-secondary)",
          maxWidth: "680px",
          margin: "0 auto 2.5rem",
          lineHeight: 1.6,
        }}
      >
        SolarScope integrates hourly atmospheric reanalysis data with transparent financial calculation engines.
        Define your site scope, evaluate actual monthly solar generation, model avoided-bill savings, and test sensitivity scenarios with zero fabricated values.
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "4rem" }}>
        <button
          onClick={() => navigateTo("scope")}
          className="btn btn-primary"
          style={{ padding: "0.875rem 2rem", fontSize: "1.05rem" }}
        >
          Let's go <ArrowRight size={18} />
        </button>
        <button
          onClick={() => navigateTo("methodology")}
          className="btn btn-secondary"
          style={{ padding: "0.875rem 1.5rem", fontSize: "1.05rem" }}
        >
          View Methodology
        </button>
      </div>

      {/* Principles Pillars */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", textAlign: "left" }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Shield size={20} color="var(--emerald-600)" />
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Zero Fabricated Results</h3>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Every output is traceable to hourly reanalysis time-series or an explicitly declared user assumption. No silent hallucinated values.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Sliders size={20} color="var(--emerald-600)" />
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Deterministic Scenarios</h3>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Evaluate generation deficits, grid price escalation, or cost overruns without mutating the baseline or requiring arbitrary LLMs.
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <FileText size={20} color="var(--emerald-600)" />
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Audit-Ready Reports</h3>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Generate reproducible PDF reports with complete mathematical formulas, data provenance, and clear engineering limitations.
          </p>
        </div>
      </div>
    </div>
  );
};
