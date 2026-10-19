import React from "react";

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle?: string;
  badge?: string;
  variant?: "default" | "highlight" | "warning";
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  badge,
  variant = "default",
}) => {
  const getBorderColor = () => {
    if (variant === "highlight") return "var(--emerald-500)";
    if (variant === "warning") return "var(--amber-500)";
    return "var(--border-default)";
  };

  return (
    <div
      className="card"
      style={{
        padding: "1.25rem",
        borderTop: variant !== "default" ? `3px solid ${getBorderColor()}` : undefined,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {title}
        </span>
        {badge && <span className="badge badge-emerald" style={{ fontSize: "0.7rem" }}>{badge}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem", marginBottom: "0.35rem" }}>
        <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--text-secondary)" }}>{unit}</span>}
      </div>

      {subtitle && (
        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", lineHeight: 1.3 }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
