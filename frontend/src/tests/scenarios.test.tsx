import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent } from "../utils/formatting";

describe("Formatting and Scenario Delta Arithmetic", () => {
  it("correctly formats currency with standard symbols and decimals", () => {
    expect(formatCurrency(12500)).toBe("$12,500");
    expect(formatCurrency(850.5, 2)).toBe("$850.50");
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
