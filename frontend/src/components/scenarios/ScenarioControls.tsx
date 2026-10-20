import React, { useState, useEffect } from "react";
import { ScenarioRequest } from "../../types/analysis";
import { Sliders, TrendingDown, TrendingUp, DollarSign, ShieldAlert, Play, RotateCcw } from "lucide-react";
import { getCurrencySymbol } from "../../utils/formatting";

interface ScenarioControlsProps {
  onRunScenario: (req: ScenarioRequest) => void;
  isLoading: boolean;
  baselineCost: number;
  baselineImportTariff: number;
  weakestMonthName: string;
  currencyCode?: string;
  existingScenarioIds?: string[];
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({
  onRunScenario,
  isLoading,
  baselineCost,
  baselineImportTariff,
  weakestMonthName,
  currencyCode = "USD",
  existingScenarioIds = [],
}) => {
  const currSym = getCurrencySymbol(currencyCode);
  const [selectedPreset, setSelectedPreset] = useState<string>("shading");
  const [customGenPct, setCustomGenPct] = useState<number>(0);
  const [customCostOverride, setCustomCostOverride] = useState<number>(baselineCost);
  const [customTariffOverride, setCustomTariffOverride] = useState<number>(baselineImportTariff);

  // Synchronize custom inputs when baseline props change
  useEffect(() => {
    setCustomCostOverride(baselineCost);
    setCustomTariffOverride(baselineImportTariff);
  }, [baselineCost, baselineImportTariff]);

  const handleResetToBaseline = () => {
    setCustomGenPct(0);
    setCustomCostOverride(baselineCost);
    setCustomTariffOverride(baselineImportTariff);
  };

  const handleRunPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);

    let req: ScenarioRequest;

    if (presetKey === "shading") {
      req = {
        scenario_id: "shading_15",
        scenario_name: "Irradiance Reduction (-15%)",
        description:
          "Hypothetical sensitivity: annual generation reduced by 15% to simulate persistent soiling, tree shading, or anomalous cloud cover.",
        generation_pct_adjustment: -15.0,
      };
    } else if (presetKey === "cost_hike") {
      const deltaCost = Math.round(baselineCost * 0.15);
      req = {
        scenario_id: "cost_hike_15",
        scenario_name: "Capital Cost Increase (+15%)",
        description: `Turnkey installation cost increased by ${currSym}${deltaCost.toLocaleString()} (15%) due to electrical upgrades or structural reinforcement.`,
        installation_cost_override: baselineCost + deltaCost,
      };
    } else if (presetKey === "tariff_escalation") {
      const newTariff = parseFloat((baselineImportTariff * 1.25).toFixed(3));
      req = {
        scenario_id: "tariff_escalation_25",
        scenario_name: "Utility Grid Tariff Escalation (+25%)",
        description: `Retail import electricity tariff rises from ${currSym}${baselineImportTariff.toFixed(
          3
        )} to ${currSym}${newTariff.toFixed(3)}/kWh, accelerating avoided-bill solar savings.`,
        import_tariff_override: newTariff,
      };
    } else if (presetKey === "weakest_month") {
      req = {
        scenario_id: "weakest_month_stress",
        scenario_name: `Seasonal Stress Test (-25% Annual Yield)`,
        description: `Sensitivity stress test applying a -25% annual generation reduction, calibrated to prolonged winter insolation deficits observed in ${weakestMonthName}. Evaluates full-year economics under seasonal underperformance without substituting single-month generation for annual totals.`,
        generation_pct_adjustment: -25.0,
      };
    } else {
      // Custom fine-tuned scenario: verify independent or combined application
      const hasGenChange = customGenPct !== 0 && !isNaN(customGenPct);
      const hasCostChange = customCostOverride !== baselineCost && !isNaN(customCostOverride);
      const hasTariffChange = customTariffOverride !== baselineImportTariff && !isNaN(customTariffOverride);

      const genDelta = hasGenChange ? customGenPct : undefined;
      const costOverride = hasCostChange ? customCostOverride : undefined;
      const tariffOverride = hasTariffChange ? customTariffOverride : undefined;

      const changeSummaries: string[] = [];
      if (hasGenChange) {
        changeSummaries.push(`generation ${customGenPct > 0 ? "+" : ""}${customGenPct}%`);
      }
      if (hasCostChange) {
        const costDiff = customCostOverride - baselineCost;
        changeSummaries.push(`cost ${costDiff > 0 ? "+" : "-"}${currSym}${Math.abs(costDiff).toLocaleString()}`);
      }
      if (hasTariffChange) {
        changeSummaries.push(`import tariff ${currSym}${customTariffOverride.toFixed(3)}/kWh`);
      }

      const desc =
        changeSummaries.length > 0
          ? `Custom sensitivity evaluation: ${changeSummaries.join(", ")}.`
          : "Custom sensitivity evaluation with baseline parameters (no perturbation).";

      let customId = "custom_scenario";
      let counter = 2;
      while (existingScenarioIds.includes(customId)) {
        customId = `custom_scenario_${counter}`;
        counter++;
      }

      req = {
        scenario_id: customId,
        scenario_name: counter > 2 ? `Custom Parameter Adjustment (${counter - 1})` : "Custom Parameter Adjustment",
        description: desc,
        generation_pct_adjustment: genDelta,
        installation_cost_override: costOverride,
        import_tariff_override: tariffOverride,
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
          data-testid="preset-shading-btn"
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
          data-testid="preset-tariff-btn"
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
          data-testid="preset-cost-btn"
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
          data-testid="preset-weakest-month-btn"
        >
          <ShieldAlert size={18} color="var(--blue-500)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Seasonal Stress Test</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>Modeled after {weakestMonthName} (-25% annual yield)</div>
          </div>
        </button>
      </div>

      {/* Parameter adjusters */}
      <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            Fine-Tune Parameters for Custom Scenario
          </h4>
          <button
            type="button"
            onClick={handleResetToBaseline}
            className="btn btn-subtle"
            style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
            data-testid="reset-custom-params-btn"
          >
            <RotateCcw size={12} />
            Reset to Baseline
          </button>
        </div>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          Modify individual parameters independently to isolate sensitivity. Parameters matching baseline are not perturbed.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Generation Delta (%)
            </label>
            <input
              type="number"
              value={customGenPct}
              onChange={(e) => setCustomGenPct(parseFloat(e.target.value) || 0)}
              data-testid="custom-gen-input"
              style={{
                width: "100%",
                padding: "0.4rem 0.5rem",
                fontSize: "0.875rem",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
            <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: "0.2rem", display: "block" }}>
              Baseline: 0% delta
            </span>
          </div>

          <div>
            <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Installation Cost ({currSym})
            </label>
            <input
              type="number"
              value={customCostOverride}
              onChange={(e) => setCustomCostOverride(parseFloat(e.target.value) || 0)}
              data-testid="custom-cost-input"
              style={{
                width: "100%",
                padding: "0.4rem 0.5rem",
                fontSize: "0.875rem",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
            <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: "0.2rem", display: "block" }}>
              Baseline: {currSym}{baselineCost.toLocaleString()}
            </span>
          </div>

          <div>
            <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Import Tariff ({currSym}/kWh)
            </label>
            <input
              type="number"
              step="0.001"
              value={customTariffOverride}
              onChange={(e) => setCustomTariffOverride(parseFloat(e.target.value) || 0)}
              data-testid="custom-tariff-input"
              style={{
                width: "100%",
                padding: "0.4rem 0.5rem",
                fontSize: "0.875rem",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
              }}
            />
            <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: "0.2rem", display: "block" }}>
              Baseline: {currSym}{baselineImportTariff.toFixed(3)}/kWh
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleRunPreset("custom")}
          disabled={isLoading}
          className="btn btn-primary"
          style={{ width: "100%", padding: "0.65rem", fontSize: "0.9375rem" }}
          data-testid="run-custom-scenario-btn"
        >
          <Play size={16} />
          {isLoading ? "Evaluating Scenario..." : "Calculate Scenario Deltas"}
        </button>
      </div>
    </div>
  );
};
