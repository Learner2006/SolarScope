import React, { ReactNode } from "react";
import { Header } from "./Header";
import { useAnalysis } from "../../state/AnalysisContext";
import { getFooterAttribution } from "../../utils/provenance";

export const AppShell: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { navigateTo, currentAnalysis } = useAnalysis();
  const attribution = getFooterAttribution(currentAnalysis?.generation.provenance);

  return (
    <div className="app-shell">
      <Header />
      <main className="main-content">{children}</main>
      <footer className="app-footer">
        <div className="footer-citation" data-testid="footer-attribution">
          <strong>{attribution.lead}</strong> {attribution.detail}
          {attribution.citation && (
            <span>
              {" "}Citation: {attribution.citation}
              {attribution.license && <span> {attribution.license}</span>}
            </span>
          )}
        </div>
        <div>
          <button
            onClick={() => navigateTo("methodology")}
            style={{ color: "var(--emerald-600)", fontWeight: 500, fontSize: "0.8125rem" }}
          >
            Inspect Documentation & Formulas →
          </button>
        </div>
      </footer>
    </div>
  );
};
