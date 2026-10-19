import React, { useState } from "react";
import { ScenarioRequest } from "../../types/analysis";
import { Sliders, TrendingDown, TrendingUp, DollarSign, ShieldAlert, Play } from "lucide-react";

interface ScenarioControlsProps {
  onRunScenario: (req: ScenarioRequest) => void;
  isLoading: boolean;
  baselineCost: number;
  baselineImportTariff: number;
  weakestMonthName: string;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  onRunScenario,
  isLoading,
  baselineCost,
  baselineImportTariff,
  weakestMonthName,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>("shading");
  const [customGenPct, setCustomGenPct] = useState<number>(-15);
  const [customCostOverride, setCustomCostOverride] = useState<number>(baselineCost * 1.15);
  const [customTariffOverride, setCustomTariffOverride] = useState<number>(baselineImportTariff * 1.2);

  const handleRunPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);

    let req: ScenarioRequest;

    if (presetKey === "shading") {
      req = {
        scenario_id: `shading_${Math.abs(customGenPct)}`,
        scenario_name: `Irradiance Reduction (${customGenPct}%)`,
        description: `Hypothetical sensitivity: generation reduced by ${Math.abs(
          customGenPct
        )}% to simulate heavy tree shading, persistent soiling, or anomalous cloud cover.`,
        generation_pct_adjustment: customGenPct,
      };
    } else if (presetKey === "cost_hike") {
      const deltaCost = Math.round(baselineCost * 0.15);
      req = {
        scenario_id: "cost_hike_15",
        scenario_name: "Capital Cost Increase (+15%)",
        description: `Turnkey installation cost increased by $${deltaCost} (15%) due to electrical upgrades or structural reinforcement.`,
        installation_cost_override: baselineCost + deltaCost,
      };
    } else if (presetKey === "tariff_escalation") {
      const newTariff = parseFloat((baselineImportTariff * 1.25).toFixed(3));
      req = {
        scenario_id: "tariff_escalation_25",
        scenario_name: "Utility Grid Tariff Escalation (+25%)",
        description: `Retail import electricity tariff rises from $${baselineImportTariff.toFixed(
          2
        )} to $${newTariff.toFixed(2)}/kWh, accelerating avoided-bill solar savings.`,
        import_tariff_override: newTariff,
      };
    } else if (presetKey === "weakest_month") {
      req = {
        scenario_id: "weakest_month_stress",
        scenario_name: `Weakest Month Stress Test (${weakestMonthName})`,
        description: `Sensitivity stress test assuming extended seasonal reduction in annual yield modeled after ${weakestMonthName}.`,
        generation_pct_adjustment: -25.0,
      };
    } else {
      // Custom
      req = {
        scenario_id: "custom_scenario",
        scenario_name: "Custom Parameter Adjustment",
        description: "User-defined sensitivity testing multiple parameter variations simultaneously.",
        generation_pct_adjustment: customGenPct,
        installation_cost_override: customCostOverride,
        import_tariff_override: customTariffOverride,
      };
    }

    onRunScenario(req);
  };

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <Sliders size={20} color="var(--emerald-600)" />
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Create Sensitivity Scenario</h3>
      </div>
      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
        Explore how technical risks, price shifts, or cost changes affect economic returns without modifying the validated baseline.
      </p>

      {/* Preset options */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => handleRunPreset("shading")}
          className="btn btn-secondary"
          style={{
            justifyContent: "flex-start",
            textAlign: "left",
            padding: "0.875rem",
            borderColor: selectedPreset === "shading" ? "var(--emerald-600)" : "var(--border-default)",
            backgroundColor: selectedPreset === "shading" ? "var(--emerald-50)" : "var(--bg-primary)",
          }}
        >
          <TrendingDown size={18} color="var(--amber-500)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Shading / Weather Deficit</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>-15% annual solar yield</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleRunPreset("tariff_escalation")}
          className="btn btn-secondary"
          style={{
            justifyContent: "flex-start",
            textAlign: "left",
            padding: "0.875rem",
            borderColor: selectedPreset === "tariff_escalation" ? "var(--emerald-600)" : "var(--border-default)",
            backgroundColor: selectedPreset === "tariff_escalation" ? "var(--emerald-50)" : "var(--bg-primary)",
          }}
        >
          <TrendingUp size={18} color="var(--emerald-600)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Grid Tariff Inflation</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>+25% retail electricity price</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleRunPreset("cost_hike")}
          className="btn btn-secondary"
          style={{
            justifyContent: "flex-start",
            textAlign: "left",
            padding: "0.875rem",
            borderColor: selectedPreset === "cost_hike" ? "var(--emerald-600)" : "var(--border-default)",
            backgroundColor: selectedPreset === "cost_hike" ? "var(--emerald-50)" : "var(--bg-primary)",
          }}
        >
          <DollarSign size={18} color="var(--rose-500)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Cost Overrun (+15%)</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Interconnection or roof upgrades</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleRunPreset("weakest_month")}
          className="btn btn-secondary"
          style={{
            justifyContent: "flex-start",
            textAlign: "left",
            padding: "0.875rem",
            borderColor: selectedPreset === "weakest_month" ? "var(--emerald-600)" : "var(--border-default)",
            backgroundColor: selectedPreset === "weakest_month" ? "var(--emerald-50)" : "var(--bg-primary)",
          }}
        >
          <ShieldAlert size={18} color="var(--blue-500)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Seasonal Stress Test</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Modeled after {weakestMonthName}</div>
          </div>
        </button>
      </div>

      {/* Parameter adjusters */}
      <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "1rem" }}>
        <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Fine-Tune Parameters for Custom Scenario
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Generation Delta (%)
            </label>
            <input
              type="number"
              value={customGenPct}
              onChange={(e) => setCustomGenPct(parseFloat(e.target.value) || 0)}
              style={{
                width: "100%",
                padding: "0.4rem 0.5rem",
                fontSize: "0.875rem",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Installation Cost ($)
            </label>
            <input
              type="number"
              value={customCostOverride}
              onChange={(e) => setCustomCostOverride(parseFloat(e.target.value) || 0)}
              style={{
                width: "100%",
                padding: "0.4rem 0.5rem",
                fontSize: "0.875rem",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Import Tariff ($/kWh)
            </label>
            <input
              type="number"
              step="0.01"
              value={customTariffOverride}
              onChange={(e) => setCustomTariffOverride(parseFloat(e.target.value) || 0)}
              style={{
                width: "100%",
                padding: "0.4rem 0.5rem",
                fontSize: "0.875rem",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleRunPreset("custom")}
          disabled={isLoading}
          className="btn btn-primary"
          style={{ width: "100%", padding: "0.65rem", fontSize: "0.9375rem" }}
        >
          <Play size={16} />
          {isLoading ? "Evaluating Scenario..." : "Calculate Scenario Deltas"}
        </button>
      </div>
    </div>
  );
};
