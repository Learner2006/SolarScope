import React from "react";
import { Provenance } from "../../types/analysis";
import { ShieldCheck } from "lucide-react";

interface ProvenanceTableProps {
  provenance: Provenance;
}

export const ProvenanceTable: React.FC<ProvenanceTableProps> = ({ provenance }) => {
  return (
    <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <ShieldCheck size={18} color="var(--emerald-600)" />
        <h4 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Data Provenance & Traceability Record</h4>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", fontSize: "0.8125rem" }}>
        <div>
          <span style={{ color: "var(--text-tertiary)", display: "block" }}>Source Mode:</span>
          <strong>{provenance.is_live_retrieval ? "Renewables.ninja Live HTTP API" : "Local Verified Benchmark Fixture"}</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-tertiary)", display: "block" }}>Weather Dataset:</span>
          <strong>{provenance.dataset_name.toUpperCase()} Reanalysis</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-tertiary)", display: "block" }}>Retrieval Timestamp:</span>
          <strong>{provenance.retrieval_timestamp}</strong>
        </div>
        <div>
          <span style={{ color: "var(--text-tertiary)", display: "block" }}>Coordinates Evaluated:</span>
          <strong>{provenance.coordinates_used}</strong>
        </div>
      </div>

      <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
        <strong>Attribution Citation:</strong> {provenance.attribution}
      </div>
    </div>
  );
};
