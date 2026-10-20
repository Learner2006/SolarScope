import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { formatCurrency, formatPercent, getCurrencySymbol } from "../utils/formatting";
import { ScenarioControls } from "../components/scenarios/ScenarioControls";
import { ScenarioComparisonChart } from "../components/scenarios/ScenarioComparisonChart";
import { ScenarioResponse } from "../types/analysis";

describe("Formatting and Scenario Delta Arithmetic", () => {
  it("correctly formats currency with standard symbols and decimals", () => {
    expect(formatCurrency(12500)).toBe("$12,500");
    expect(formatCurrency(850.5, 2)).toBe("$850.50");
    expect(formatCurrency(12500, "INR")).toBe("₹12,500");
    expect(formatCurrency(12500.75, "INR", 2)).toBe("₹12,500.75");
    expect(formatCurrency(500, "EUR")).toBe("€500");
    expect(formatCurrency(750, "GBP")).toBe("£750");
  });

  it("maps currency codes to correct symbols with getCurrencySymbol", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("INR")).toBe("₹");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("GBP")).toBe("£");
    expect(getCurrencySymbol("CAD")).toBe("CA$");
    expect(getCurrencySymbol("AUD")).toBe("A$");
    expect(getCurrencySymbol("XYZ")).toBe("XYZ");
  });

  it("correctly formats percentages from decimals or whole numbers", () => {
    expect(formatPercent(0.175, true, 1)).toBe("17.5%");
    expect(formatPercent(15.0, false, 0)).toBe("15%");
  });

  it("calculates expected delta percentages between baseline and scenario", () => {
    const baselineSavings = 1000;
    const scenarioSavings = 850;
    const diff = scenarioSavings - baselineSavings;
    const pct = (diff / baselineSavings) * 100;

    expect(diff).toBe(-150);
    expect(pct).toBe(-15);
  });
});

describe("ScenarioControls — Independent Parameter Adjustments & Isolation", () => {
  const defaultProps = {
    onRunScenario: vi.fn(),
    isLoading: false,
    baselineCost: 8000,
    baselineImportTariff: 0.25,
    weakestMonthName: "December",
    currencyCode: "USD",
  };

  it("renders preset buttons and fine-tune fields with active currency symbol", () => {
    render(<ScenarioControls {...defaultProps} currencyCode="INR" />);

    expect(screen.getByText("Shading / Weather Deficit")).toBeDefined();
    expect(screen.getByText("Grid Tariff Inflation")).toBeDefined();
    expect(screen.getByText("Cost Overrun (+15%)")).toBeDefined();
    expect(screen.getByText(/Modeled after December/)).toBeDefined();

    // Field labels and baseline indicators should use ₹ for INR
    expect(screen.getByText("Installation Cost (₹)")).toBeDefined();
    expect(screen.getByText("Import Tariff (₹/kWh)")).toBeDefined();
    expect(screen.getByText("Baseline: ₹8,000")).toBeDefined();
    expect(screen.getByText("Baseline: ₹0.250/kWh")).toBeDefined();
  });

  it("dispatches isolated generation adjustment when only generation delta is modified", () => {
    const onRun = vi.fn();
    render(<ScenarioControls {...defaultProps} onRunScenario={onRun} />);

    const genInput = screen.getByTestId("custom-gen-input");
    fireEvent.change(genInput, { target: { value: "-12" } });

    const runBtn = screen.getByTestId("run-custom-scenario-btn");
    fireEvent.click(runBtn);

    expect(onRun).toHaveBeenCalledTimes(1);
    const req = onRun.mock.calls[0][0];

    // Generation is modified:
    expect(req.generation_pct_adjustment).toBe(-12);
    // Cost and tariff must remain strictly undefined (not overridden):
    expect(req.installation_cost_override).toBeUndefined();
    expect(req.import_tariff_override).toBeUndefined();
    expect(req.description).toContain("generation -12%");
  });

  it("dispatches isolated cost adjustment when only installation cost is modified", () => {
    const onRun = vi.fn();
    render(<ScenarioControls {...defaultProps} onRunScenario={onRun} />);

    const costInput = screen.getByTestId("custom-cost-input");
    fireEvent.change(costInput, { target: { value: "9500" } });

    const runBtn = screen.getByTestId("run-custom-scenario-btn");
    fireEvent.click(runBtn);

    expect(onRun).toHaveBeenCalledTimes(1);
    const req = onRun.mock.calls[0][0];

    // Capex is modified:
    expect(req.installation_cost_override).toBe(9500);
    // Generation and tariff must remain strictly undefined:
    expect(req.generation_pct_adjustment).toBeUndefined();
    expect(req.import_tariff_override).toBeUndefined();
    expect(req.description).toContain("cost +$1,500");
  });

  it("dispatches isolated tariff adjustment when only import tariff is modified", () => {
    const onRun = vi.fn();
    render(<ScenarioControls {...defaultProps} onRunScenario={onRun} />);

    const tariffInput = screen.getByTestId("custom-tariff-input");
    fireEvent.change(tariffInput, { target: { value: "0.32" } });

    const runBtn = screen.getByTestId("run-custom-scenario-btn");
    fireEvent.click(runBtn);

    expect(onRun).toHaveBeenCalledTimes(1);
    const req = onRun.mock.calls[0][0];

    // Tariff is modified:
    expect(req.import_tariff_override).toBe(0.32);
    // Generation and capex must remain strictly undefined:
    expect(req.generation_pct_adjustment).toBeUndefined();
    expect(req.installation_cost_override).toBeUndefined();
    expect(req.description).toContain("import tariff $0.320/kWh");
  });

  it("dispatches compound multi-parameter adjustments when multiple fields are modified", () => {
    const onRun = vi.fn();
    render(<ScenarioControls {...defaultProps} onRunScenario={onRun} />);

    fireEvent.change(screen.getByTestId("custom-gen-input"), { target: { value: "-10" } });
    fireEvent.change(screen.getByTestId("custom-cost-input"), { target: { value: "9000" } });
    fireEvent.change(screen.getByTestId("custom-tariff-input"), { target: { value: "0.29" } });

    fireEvent.click(screen.getByTestId("run-custom-scenario-btn"));

    expect(onRun).toHaveBeenCalledTimes(1);
    const req = onRun.mock.calls[0][0];

    expect(req.generation_pct_adjustment).toBe(-10);
    expect(req.installation_cost_override).toBe(9000);
    expect(req.import_tariff_override).toBe(0.29);
  });

  it("resets fine-tune inputs back to baseline upon clicking Reset to Baseline", () => {
    render(<ScenarioControls {...defaultProps} />);

    const genInput = screen.getByTestId("custom-gen-input") as HTMLInputElement;
    const costInput = screen.getByTestId("custom-cost-input") as HTMLInputElement;
    const tariffInput = screen.getByTestId("custom-tariff-input") as HTMLInputElement;

    fireEvent.change(genInput, { target: { value: "-25" } });
    fireEvent.change(costInput, { target: { value: "11000" } });
    fireEvent.change(tariffInput, { target: { value: "0.40" } });

    expect(genInput.value).toBe("-25");
    expect(costInput.value).toBe("11000");
    expect(tariffInput.value).toBe("0.40");

    // Click reset
    fireEvent.click(screen.getByTestId("reset-custom-params-btn"));

    expect(genInput.value).toBe("0");
    expect(costInput.value).toBe("8000");
    expect(tariffInput.value).toBe("0.25");
  });
});

describe("ScenarioComparisonChart — Traceability and Formula Verification", () => {
  const mockScenarioResponse: ScenarioResponse = {
    scenario_id: "custom_audit",
    scenario_name: "Audit Test Scenario",
    description: "Multi-parameter test scenario",
    baseline_financials: {
      installation_cost: 8000.0,
      import_tariff: 0.24,
      export_tariff: 0.06,
      self_consumption_ratio: 0.70,
      annual_maintenance_cost: 80.0,
      project_lifetime_years: 25,
      total_generation_kwh: 6000.0,
      self_consumed_kwh: 4200.0,
      exported_kwh: 1800.0,
      avoided_import_savings: 1008.0,
      export_revenue: 108.0,
      gross_annual_savings: 1116.0,
      net_annual_benefit: 1036.0,
      simple_payback_years: 7.72,
      is_payback_achievable: true,
      payback_status: "Payback in 7.7 years",
      lifetime_total_generation_kwh: 150000.0,
      lifetime_gross_savings: 27900.0,
      lifetime_operating_costs: 2000.0,
      lifetime_net_cash_flow: 17900.0,
      roi_percentage: 223.8,
      lcoe_per_kwh: 0.0667,
      currency_code: "USD",
      cash_flow_timeline: [],
      warnings: [],
    },
    scenario_financials: {
      installation_cost: 9200.0,
      import_tariff: 0.30,
      export_tariff: 0.06,
      self_consumption_ratio: 0.70,
      annual_maintenance_cost: 80.0,
      project_lifetime_years: 25,
      total_generation_kwh: 5280.0,
      self_consumed_kwh: 3696.0,
      exported_kwh: 1584.0,
      avoided_import_savings: 1108.80,
      export_revenue: 95.04,
      gross_annual_savings: 1203.84,
      net_annual_benefit: 1123.84,
      simple_payback_years: 8.19,
      is_payback_achievable: true,
      payback_status: "Payback in 8.2 years",
      lifetime_total_generation_kwh: 132000.0,
      lifetime_gross_savings: 30096.0,
      lifetime_operating_costs: 2000.0,
      lifetime_net_cash_flow: 18896.0,
      roi_percentage: 205.4,
      lcoe_per_kwh: 0.0848,
      currency_code: "USD",
      cash_flow_timeline: [],
      warnings: [],
    },
    delta: {
      generation_diff_kwh: -720.0,
      generation_diff_pct: -12.0,
      gross_savings_diff_usd: 87.84,
      gross_savings_diff_pct: 7.9,
      net_annual_benefit_diff_usd: 87.84,
      payback_diff_years: 0.47,
      lifetime_cash_flow_diff_usd: 996.0,
      lifetime_cash_flow_diff_pct: 5.6,
      summary_message: "Under generation -12.0%, cost +$1200, import tariff $0.300/kWh, net annual savings change by +$87.84/yr, which extends payback by +0.5 years.",
    },
    warnings: [],
  };

  it("renders scenario metrics and table matching baseline and scenario values", () => {
    render(<ScenarioComparisonChart scenario={mockScenarioResponse} />);

    expect(screen.getByText("Scenario: Audit Test Scenario")).toBeDefined();
    expect(screen.getByText(/extends payback by \+0\.5 years/)).toBeDefined();

    // Table checks
    expect(screen.getByText("Detailed Traceability Comparison Table")).toBeDefined();
    expect(screen.getByText("Turnkey Capital Cost")).toBeDefined();
    expect(screen.getByText("$8,000")).toBeDefined();
    expect(screen.getByText("$9,200")).toBeDefined();

    expect(screen.getByText("6,000 kWh")).toBeDefined();
    expect(screen.getByText("5,280 kWh")).toBeDefined();
    expect(screen.getByText("-720 kWh")).toBeDefined();
    expect(screen.getByText("-12%")).toBeDefined();
  });
});
