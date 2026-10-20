import React from "react";
import { Sun, FileText, BarChart2, GitFork, BookOpen, Layers } from "lucide-react";
import { ScreenName, useAnalysis } from "../../state/AnalysisContext";
import { getProvenanceBadge } from "../../utils/provenance";

export const Header: React.FC = () => {
  const { activeScreen, navigateTo, currentAnalysis } = useAnalysis();

  const isAnalysisAvailable = Boolean(currentAnalysis);

  const navItems: { id: ScreenName; label: string; icon: React.ReactNode; disabled: boolean }[] = [
    {
      id: "scope",
      label: "Define Scope",
      icon: <Layers size={16} />,
      disabled: false,
    },
    {
      id: "analysis",
      label: "Dashboard",
      icon: <BarChart2 size={16} />,
      disabled: !isAnalysisAvailable,
    },
    {
      id: "scenarios",
      label: "Scenarios",
      icon: <GitFork size={16} />,
      disabled: !isAnalysisAvailable,
    },
    {
      id: "report",
      label: "Report",
      icon: <FileText size={16} />,
      disabled: !isAnalysisAvailable,
    },
    {
      id: "methodology",
      label: "Methodology",
      icon: <BookOpen size={16} />,
      disabled: false,
    },
  ];

  return (
    <header className="app-header">
      <div className="brand-logo" onClick={() => navigateTo("landing")}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Sun className="brand-icon" />
        </div>
        <span>SolarScope</span>
      </div>

      <nav className="nav-links">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && navigateTo(item.id)}
            disabled={item.disabled}
            className={`nav-item ${activeScreen === item.id ? "active" : ""} ${
              item.disabled ? "disabled" : ""
            }`}
            style={{
              opacity: item.disabled ? 0.4 : 1,
              cursor: item.disabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {currentAnalysis ? (
          <span
            className={`badge ${getProvenanceBadge(currentAnalysis.generation.provenance).className}`}
            title={getProvenanceBadge(currentAnalysis.generation.provenance).tooltip}
            data-testid="header-provenance-badge"
          >
            {getProvenanceBadge(currentAnalysis.generation.provenance).label}
          </span>
        ) : (
          <span className="badge badge-neutral" data-testid="header-provenance-badge">
            Ready to Analyze
          </span>
        )}
      </div>
    </header>
  );
};
