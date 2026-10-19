import React from "react";
import { ReportResponse } from "../../types/analysis";
import { ProvenanceTable } from "./ProvenanceTable";
import { formatCurrency, formatNumber, formatPercent, formatDate } from "../../utils/formatting";
import { Printer, Sun } from "lucide-react";

interface ReportDocumentProps {
  report: ReportResponse;
}

export const ReportDocument: React.FC<ReportDocumentProps> = ({ report }) => {
  const {
    analysis_id,
    generated_at,
    scope,
    generation,
    financials,
    scenarios,
    provenance,
    formulas_and_methodology,
    model_limitations,
    data_quality_warnings,
    conclusions,
  } = report;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-document" style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Top action bar (hidden in print) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Solar Feasibility & Audit Report</h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
            Run ID: <code style={{ fontFamily: "var(--font-mono)" }}>{analysis_id}</code>
          </p>
        </div>
        <button onClick={handlePrint} className="btn btn-primary">
          <Printer size={16} />
          Print / Export to PDF
        </button>
      </div>

      {/* Report Header for Print & Display */}
      <div style={{ borderBottom: "2px solid var(--emerald-600)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sun size={24} color="var(--emerald-600)" />
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em" }}>SolarScope</h1>
          </div>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>
            Generated: {formatDate(generated_at)}
          </span>
        </div>
        <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          Site Feasibility Evaluation for <strong>{scope.location_name || "Custom Site"}</strong> ({scope.latitude.toFixed(4)}° N, {scope.longitude.toFixed(4)}° E)
        </div>
      </div>

      {/* Executive Summary & Conclusions */}
      <div className="card" style={{ marginBottom: "1.5rem", backgroundColor: "var(--bg-secondary)" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--emerald-900)" }}>
          Executive Findings & Deterministic Conclusions
        </h3>
        <ul style={{ paddingLeft: "1.25rem", fontSize: "0.875rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {conclusions.map((conc, idx) => (
            <li key={idx} style={{ marginBottom: "0.4rem" }}>
              {conc}
            </li>
          ))}
        </ul>
      </div>

      {/* Key Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>System Size</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "0.25rem" }}>{scope.system_capacity_kw} kW</div>
        </div>
        <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Annual Output</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "0.25rem" }}>{formatNumber(generation.total_generation_kwh, 0)} kWh</div>
        </div>
        <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Capacity Factor</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "0.25rem" }}>{generation.capacity_factor_pct}%</div>
        </div>
        <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Simple Payback</span>
          <div style={{ fontSize: "1.35rem", fontWeight: 700, marginTop: "0.25rem" }}>
            {financials.simple_payback_years !== null ? `${financials.simple_payback_years} yrs` : "Non-recovering"}
          </div>
        </div>
      </div>

      {/* Provenance Table */}
      <ProvenanceTable provenance={provenance} />

      {/* System & Financial Inputs Table */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          1. System Configuration & Economic Parameters
        </h4>
        <table style={{ width: "100%", fontSize: "0.8125rem", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "0.5rem", color: "var(--text-tertiary)", width: "35%" }}>Installation Capital Cost:</td>
              <td style={{ padding: "0.5rem", fontWeight: 600 }}>{formatCurrency(financials.installation_cost)}</td>
              <td style={{ padding: "0.5rem", color: "var(--text-tertiary)", width: "35%" }}>Electricity Import Tariff:</td>
              <td style={{ padding: "0.5rem", fontWeight: 600 }}>${financials.import_tariff.toFixed(3)}/kWh</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "0.5rem", color: "var(--text-tertiary)" }}>Grid Export Tariff:</td>
              <td style={{ padding: "0.5rem", fontWeight: 600 }}>${financials.export_tariff.toFixed(3)}/kWh</td>
              <td style={{ padding: "0.5rem", color: "var(--text-tertiary)" }}>Self-Consumption Ratio:</td>
              <td style={{ padding: "0.5rem", fontWeight: 600 }}>{formatPercent(financials.self_consumption_ratio, true)}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "0.5rem", color: "var(--text-tertiary)" }}>Annual Maintenance & O&M:</td>
              <td style={{ padding: "0.5rem", fontWeight: 600 }}>{formatCurrency(financials.annual_maintenance_cost)}/yr</td>
              <td style={{ padding: "0.5rem", color: "var(--text-tertiary)" }}>Project Lifetime:</td>
              <td style={{ padding: "0.5rem", fontWeight: 600 }}>{financials.project_lifetime_years} years</td>
            </tr>
            <tr>
              <td style={{ padding: "0.5rem", color: "var(--text-tertiary)" }}>Panel Tilt & Azimuth:</td>
              <td style={{ padding: "0.5rem", fontWeight: 600 }}>{scope.tilt_degrees}° Tilt, {scope.azimuth_degrees}° Azimuth</td>
              <td style={{ padding: "0.5rem", color: "var(--text-tertiary)" }}>Modeled System Losses:</td>
              <td style={{ padding: "0.5rem", fontWeight: 600 }}>{scope.system_losses_pct}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Monthly Generation Breakdown Table */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          2. Monthly Solar Generation Breakdown
        </h4>
        <table style={{ width: "100%", fontSize: "0.8125rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-default)", textAlign: "left", color: "var(--text-tertiary)" }}>
              <th style={{ padding: "0.5rem" }}>Month</th>
              <th style={{ padding: "0.5rem" }}>Generation (kWh)</th>
              <th style={{ padding: "0.5rem" }}>Peak Power (kW)</th>
              <th style={{ padding: "0.5rem" }}>Daily Avg (kWh/d)</th>
              <th style={{ padding: "0.5rem" }}>Capacity Factor</th>
            </tr>
          </thead>
          <tbody>
            {generation.monthly_breakdown.map((m) => (
              <tr key={m.month_label} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "0.45rem 0.5rem", fontWeight: 500 }}>{m.month_name}</td>
                <td style={{ padding: "0.45rem 0.5rem" }}>{formatNumber(m.total_kwh, 1)}</td>
                <td style={{ padding: "0.45rem 0.5rem" }}>{m.peak_kw} kW</td>
                <td style={{ padding: "0.45rem 0.5rem" }}>{m.daily_average_kwh}</td>
                <td style={{ padding: "0.45rem 0.5rem" }}>{m.capacity_factor_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scenarios Section if any */}
      {scenarios.length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            3. Evaluated Sensitivity Scenarios
          </h4>
          {scenarios.map((s) => (
            <div key={s.scenario_id} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <strong>{s.scenario_name}</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{s.delta.summary_message}</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{s.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mathematical Formulas Used */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          4. Formulas & Calculation Methodology
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem", fontSize: "0.8125rem" }}>
          {Object.entries(formulas_and_methodology).map(([name, formula]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{name}:</span>
              <code style={{ fontFamily: "var(--font-mono)", color: "var(--emerald-800)", backgroundColor: "var(--bg-secondary)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                {formula}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Model Limitations & Disclaimers */}
      <div className="card" style={{ marginBottom: "1.5rem", backgroundColor: "var(--bg-secondary)" }}>
        <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          5. Known Limitations & Technical Scope
        </h4>
        <ul style={{ paddingLeft: "1.25rem", fontSize: "0.8125rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
          {model_limitations.map((lim, i) => (
            <li key={i} style={{ marginBottom: "0.3rem" }}>
              {lim}
            </li>
          ))}
        </ul>
      </div>

      {/* Data Quality Warnings if present */}
      {data_quality_warnings.length > 0 && (
        <div className="card" style={{ padding: "1rem", borderLeft: "4px solid var(--amber-500)", backgroundColor: "var(--amber-50)" }}>
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--amber-800)", marginBottom: "0.35rem" }}>
            Data Quality & Operational Notes:
          </h4>
          <ul style={{ paddingLeft: "1.25rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            {data_quality_warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
