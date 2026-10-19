import React from "react";
import { ScopeForm } from "../components/scope/ScopeForm";
import { useAnalysis } from "../state/AnalysisContext";
import { ScopeInput } from "../types/analysis";
import { Loader2, AlertCircle } from "lucide-react";

export const ScopePage: React.FC = () => {
  const {
    runAnalysis,
    executionStage,
    executionError,
    currentAnalysis,
  } = useAnalysis();

  const isLoading = executionStage !== "idle" && executionStage !== "complete" && executionStage !== "error";

  const getStageDescription = () => {
    switch (executionStage) {
      case "validating":
        return "1/3 Validating site coordinates, calendar intervals, and economic parameters...";
      case "fetching_data":
        return "2/3 Querying hourly simulated solar generation time-series...";
      case "calculating_financials":
        return "3/3 Aggregating monthly solar energy, capacity factors, and simple payback cash flows...";
      default:
        return "Processing analysis...";
    }
  };

  return (
    <div>
      <div style={{ maxWidth: "860px", margin: "0 auto 1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Define Solar Analysis Scope
        </h1>
        <p style={{ fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
          Configure geographic location, date period, PV system specifications, and tariff assumptions.
          All default inputs are identified as assumptions and remain fully editable.
        </p>
      </div>

      {/* Screen C: Real Execution Progress State */}
      {isLoading && (
        <div
          className="card"
          style={{
            maxWidth: "860px",
            margin: "0 auto 1.5rem",
            padding: "1.25rem",
            backgroundColor: "var(--bg-secondary)",
            borderLeft: "4px solid var(--emerald-600)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <Loader2 size={24} className="rotating" color="var(--emerald-600)" style={{ animation: "spin 1s linear infinite" }} />
          <div>
            <strong style={{ display: "block", fontSize: "0.9375rem", color: "var(--text-primary)" }}>
              Executing Solar Feasibility Run
            </strong>
            <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              {getStageDescription()}
            </span>
          </div>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Honest Error State */}
      {executionStage === "error" && executionError && (
        <div
          className="card"
          style={{
            maxWidth: "860px",
            margin: "0 auto 1.5rem",
            padding: "1.25rem",
            backgroundColor: "var(--rose-50)",
            borderLeft: "4px solid var(--rose-500)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <AlertCircle size={20} color="var(--rose-500)" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong style={{ display: "block", fontSize: "0.9375rem", color: "var(--rose-500)" }}>
              Analysis Execution Halted
            </strong>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              {executionError}
            </p>
          </div>
        </div>
      )}

      <ScopeForm
        initialValues={currentAnalysis?.scope}
        onSubmit={(scope: ScopeInput, forceFixture: boolean) => runAnalysis(scope, forceFixture)}
        isLoading={isLoading}
      />
    </div>
  );
};
