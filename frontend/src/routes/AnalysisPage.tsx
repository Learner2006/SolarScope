import React from "react";
import { useAnalysis } from "../state/AnalysisContext";
import { MetricCard } from "../components/analysis/MetricCard";
import { MonthlyGenerationChart } from "../components/analysis/MonthlyGenerationChart";
import { HourlyProfileChart } from "../components/analysis/HourlyProfileChart";
import { formatCurrency, formatNumber } from "../utils/formatting";
import { FileText, GitFork, AlertTriangle } from "lucide-react";

export const AnalysisPage: React.FC = () => {
  const {
    currentAnalysis,
    navigateTo,
    selectedMonthForDrilldown,
    setSelectedMonthForDrilldown,
    resetToScope,
  } = useAnalysis();

  if (!currentAnalysis) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          No Active Solar Analysis
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          Please define a scope to execute the feasibility calculation engine.
        </p>
        <button onClick={resetToScope} className="btn btn-primary">
          Define Scope
        </button>
      </div>
    );
  }

  const { scope, generation, financials, all_warnings } = currentAnalysis;

  // Selected month points
  const selectedMonthData = selectedMonthForDrilldown
    ? generation.monthly_breakdown.find((m) => m.month === selectedMonthForDrilldown)
    : generation.strongest_month;

  const hourlyPoints = selectedMonthData
    ? generation.hourly_profiles_by_month[selectedMonthData.month] || []
    : [];

  return (
    <div>
      {/* Top action & status banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
              {scope.location_name || "Site Analysis"}
            </h1>
            <span
              className={`badge ${
                generation.provenance.is_live_retrieval ? "badge-emerald" : "badge-amber"
              }`}
            >
              {generation.provenance.is_live_retrieval ? "● Live API Data" : "● Benchmark Fixture"}
            </span>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {scope.system_capacity_kw} kW rated PV array • {generation.period_hours.toFixed(0)} hours analyzed ({scope.start_date} to {scope.end_date})
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => navigateTo("scenarios")} className="btn btn-secondary">
            <GitFork size={16} />
            Run Scenarios
          </button>
          <button onClick={() => navigateTo("report")} className="btn btn-primary">
            <FileText size={16} />
            Download Complete Report
          </button>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {all_warnings.length > 0 && (
        <div
          className="card"
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            backgroundColor: "var(--amber-50)",
            borderLeft: "4px solid var(--amber-500)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <AlertTriangle size={18} color="var(--amber-500)" />
            <strong style={{ fontSize: "0.875rem", color: "var(--amber-800)" }}>
              Data Quality & Operational Notes:
            </strong>
          </div>
          <ul style={{ paddingLeft: "1.5rem", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            {all_warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Analytical Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <MetricCard
          title="Annual Generation"
          value={formatNumber(generation.total_generation_kwh, 0)}
          unit="kWh"
          subtitle={`${generation.total_generation_mwh.toFixed(2)} MWh total yield`}
          badge="Modeled"
        />

        <MetricCard
          title="Capacity Factor"
          value={`${generation.capacity_factor_pct}%`}
          subtitle={`Across ${generation.period_hours.toFixed(0)} actual hours`}
          variant="highlight"
        />

        <MetricCard
          title="Net Annual Benefit"
          value={formatCurrency(financials.net_annual_benefit)}
          unit="/yr"
          subtitle={`Gross: ${formatCurrency(financials.gross_annual_savings)} - O&M: ${formatCurrency(financials.annual_maintenance_cost)}`}
        />

        <MetricCard
          title="Simple Payback"
          value={financials.simple_payback_years !== null ? `${financials.simple_payback_years}` : "N/A"}
          unit={financials.simple_payback_years !== null ? "years" : ""}
          subtitle={financials.payback_status}
          variant={financials.is_payback_achievable ? "highlight" : "warning"}
        />

        <MetricCard
          title="25-Yr Net Return"
          value={formatCurrency(financials.lifetime_net_cash_flow)}
          subtitle={`ROI: ${financials.roi_percentage.toFixed(1)}% undiscounted`}
        />

        <MetricCard
          title="Levelized Cost (LCOE)"
          value={`$${financials.lcoe_per_kwh.toFixed(3)}`}
          unit="/kWh"
          subtitle="Lifetime hardware & maintenance"
        />
      </div>

      {/* Monthly Generation Bar Chart */}
      <MonthlyGenerationChart
        data={generation.monthly_breakdown}
        selectedMonth={selectedMonthForDrilldown}
        onSelectMonth={(m) => setSelectedMonthForDrilldown(m)}
      />

      {/* Actual Modeled Hourly Generation Profile for Clicked Month */}
      {selectedMonthData && hourlyPoints.length > 0 && (
        <HourlyProfileChart
          monthName={selectedMonthData.month_name}
          points={hourlyPoints}
        />
      )}

      {/* System Assumptions & Provenance Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          marginTop: "1.5rem",
        }}
      >
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            Installed Configuration
          </h3>
          <ul style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.8, listStyle: "none" }}>
            <li><strong>Array Capacity:</strong> {scope.system_capacity_kw} kW DC</li>
            <li><strong>Panel Orientation:</strong> {scope.tilt_degrees}° Tilt, {scope.azimuth_degrees}° Azimuth</li>
            <li><strong>System Losses:</strong> {scope.system_losses_pct}% derate</li>
            <li><strong>Self-Consumption:</strong> {scope.self_consumption_pct}% consumed on-site</li>
            <li><strong>Import Tariff:</strong> ${scope.import_tariff.toFixed(2)}/kWh</li>
            <li><strong>Export Tariff:</strong> ${scope.export_tariff.toFixed(2)}/kWh</li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            Data Source Provenance
          </h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            {generation.provenance.is_live_retrieval
              ? "Hourly power timeseries retrieved via Renewables.ninja API using atmospheric reanalysis."
              : "Calculated using high-fidelity 8,760-hour benchmark reanalysis fixture (San Francisco solar geometry)."}
          </p>
          <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            <strong>Citation:</strong> {generation.provenance.attribution}
          </div>
        </div>
      </div>
    </div>
  );
};
