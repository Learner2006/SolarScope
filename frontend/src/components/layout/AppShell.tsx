import React, { ReactNode } from "react";
import { Header } from "./Header";
import { useAnalysis } from "../../state/AnalysisContext";

export const AppShell: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { navigateTo } = useAnalysis();

  return (
    <div className="app-shell">
      <Header />
      <main className="main-content">{children}</main>
      <footer className="app-footer">
        <div className="footer-citation">
          <strong>Methodology & Attribution:</strong> Solar simulation data powered by Renewables.ninja / MERRA-2.
          Citation: S. Pfenninger and I. Staffell (2016), <em>Energy</em> 114, 1251–1265. CC BY-NC 4.0 license.
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
