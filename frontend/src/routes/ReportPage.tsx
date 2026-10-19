import React, { useEffect, useState } from "react";
import { useAnalysis } from "../state/AnalysisContext";
import { ReportDocument } from "../components/report/ReportDocument";
import { getReport } from "../services/api";
import { ReportResponse } from "../types/analysis";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";

export const ReportPage: React.FC = () => {
  const { currentAnalysis, navigateTo } = useAnalysis();
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentAnalysis) return;

    let isMounted = true;
    setIsLoading(true);

    getReport(currentAnalysis.analysis_id)
      .then((data) => {
        if (isMounted) {
          setReport(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load report data.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentAnalysis]);

  if (!currentAnalysis) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          No Analysis to Export
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          Please execute a solar feasibility run before downloading a report.
        </p>
        <button onClick={() => navigateTo("scope")} className="btn btn-primary">
          Define Scope
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "4rem 1rem", gap: "0.75rem" }}>
        <Loader2 size={24} color="var(--emerald-600)" style={{ animation: "spin 1s linear infinite" }} />
        <span>Compiling Traceable Audit Report...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ maxWidth: "700px", margin: "2rem auto", padding: "1.5rem" }} className="card">
        <h3 style={{ color: "var(--rose-500)", marginBottom: "0.5rem" }}>Report Generation Error</h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>{error}</p>
        <button onClick={() => navigateTo("analysis")} className="btn btn-secondary">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print" style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => navigateTo("analysis")} className="btn btn-subtle" style={{ fontSize: "0.8125rem", padding: "0.25rem 0" }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <button onClick={() => navigateTo("methodology")} className="btn btn-subtle" style={{ fontSize: "0.8125rem", color: "var(--emerald-600)" }}>
          <BookOpen size={14} /> Inspect Calculation Methodology
        </button>
      </div>

      <ReportDocument report={report} />
    </div>
  );
};
