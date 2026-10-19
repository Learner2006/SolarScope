import React from "react";

interface NumericSliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  helpText?: string;
  isAssumption?: boolean;
  onChange: (val: number) => void;
}

export const NumericSliderField: React.FC<NumericSliderFieldProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  helpText,
  isAssumption = true,
  onChange,
}) => {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.35rem",
        }}
      >
        <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>
          {label} {isAssumption && <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>(Assumption)</span>}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <input
            type="number"
            value={isNaN(value) ? "" : value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const parsed = parseFloat(e.target.value);
              onChange(isNaN(parsed) ? 0 : parsed);
            }}
            style={{
              width: "80px",
              padding: "0.25rem 0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              textAlign: "right",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--bg-primary)",
            }}
          />
          {unit && (
            <span style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)", minWidth: "36px" }}>
              {unit}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            flex: 1,
            accentColor: "var(--emerald-600)",
            cursor: "pointer",
          }}
        />
      </div>

      {helpText && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: "0.25rem" }}>
          {helpText}
        </div>
      )}
    </div>
  );
};
