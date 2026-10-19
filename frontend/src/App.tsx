import React from "react";
import { AppShell } from "./components/layout/AppShell";
import { useAnalysis } from "./state/AnalysisContext";
import { LandingPage } from "./routes/LandingPage";
import { ScopePage } from "./routes/ScopePage";
import { AnalysisPage } from "./routes/AnalysisPage";
import { ScenariosPage } from "./routes/ScenariosPage";
import { ReportPage } from "./routes/ReportPage";
import { MethodologyPage } from "./routes/MethodologyPage";

export const AppContent: React.FC = () => {
  const { activeScreen } = useAnalysis();

  return (
    <AppShell>
      {activeScreen === "landing" && <LandingPage />}
      {activeScreen === "scope" && <ScopePage />}
      {activeScreen === "analysis" && <AnalysisPage />}
      {activeScreen === "scenarios" && <ScenariosPage />}
      {activeScreen === "report" && <ReportPage />}
      {activeScreen === "methodology" && <MethodologyPage />}
    </AppShell>
  );
};

export default function App() {
  return <AppContent />;
}
