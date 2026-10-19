import React from "react";
import { useAnalysis } from "../state/AnalysisContext";
import { useScenarios } from "../hooks/useScenarios";
import { ScenarioControls } from "../components/scenarios/ScenarioControls";
import { ScenarioComparisonChart } from "../components/scenarios/ScenarioComparisonChart";
import { ArrowLeft, FileText } from "lucide-react";

export const ScenariosPage: React.FC = () => {
  const { currentAnalysis, navigateTo } = useAnalysis();
  const {
    scenarios,
    selectedScenario,
    setActiveScenarioId,
    executeScenario,
    isSubmitting,
  } = useScenarios();

  if (!currentAnalysis) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          No Baseline Analysis Found
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          You must establish a baseline solar feasibility run before running sensitivity scenarios.
        </p>
        <button onClick={() => navigateTo("scope")} className="btn btn-primary">
          Define Scope
        </button>
      </div>
    );
  }

  const { financials, generation } = currentAnalysis;

  return (
    <div>
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
          <button
            onClick={() => navigateTo("analysis")}
            className="btn btn-subtle"
            style={{ padding: "0.25rem 0", marginBottom: "0.5rem", fontSize: "0.8125rem" }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
            Sensitivity & Scenario Analysis
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Baseline system: {currentAnalysis.scope.system_capacity_kw} kW array • Payback: {financials.simple_payback_years !== null ? `${financials.simple_payback_years} yrs` : "N/A"} • Net Savings: ${financials.net_annual_benefit}/yr
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => navigateTo("report")} className="btn btn-primary">
            <FileText size={16} />
            Export Report with Scenarios
          </button>
        </div>
      </div>

      {/* Scenario Controls */}
      <ScenarioControls
        onRunScenario={executeScenario}
        isLoading={isSubmitting}
        baselineCost={financials.installation_cost}
        baselineImportTariff={financials.import_tariff}
        weakestMonthName={generation.weakest_month.month_name}
      />

      {/* Existing Evaluated Scenarios Selector if multiple */}
      {scenarios.length > 1 && (
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500 }}>
            Evaluated Scenarios:
          </span>
          {scenarios.map((s) => (
            <button
              key={s.scenario_id}
              onClick={() => setActiveScenarioId(s.scenario_id)}
              className="btn btn-secondary"
              style={{
                fontSize: "0.8125rem",
                padding: "0.3rem 0.75rem",
                borderColor: selectedScenario?.scenario_id === s.scenario_id ? "var(--emerald-600)" : "var(--border-default)",
                backgroundColor: selectedScenario?.scenario_id === s.scenario_id ? "var(--emerald-50)" : "var(--bg-primary)",
                color: selectedScenario?.scenario_id === s.scenario_id ? "var(--emerald-700)" : "var(--text-secondary)",
              }}
            >
              {s.scenario_name}
            </button>
          ))}
        </div>
      )}

      {/* Comparison View */}
      {selectedScenario && <ScenarioComparisonChart scenario={selectedScenario} />}
    </div>
  );
};
