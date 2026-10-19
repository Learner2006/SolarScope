import { describe, it, expect } from "vitest";
import { validateScopeInput } from "../utils/validation";
import { ScopeInput } from "../types/analysis";

describe("Scope Input Validation", () => {
  const baseValidScope: ScopeInput = {
    location_name: "San Francisco, CA",
    latitude: 37.7749,
    longitude: -122.4194,
    start_date: "2019-01-01",
    end_date: "2019-12-31",
    system_capacity_kw: 5.0,
    tilt_degrees: 30.0,
    azimuth_degrees: 180.0,
    system_losses_pct: 10.0,
    installation_cost: 7500.0,
    import_tariff: 0.28,
    export_tariff: 0.06,
    self_consumption_pct: 65.0,
    annual_maintenance_cost: 75.0,
    project_lifetime_years: 25,
  };

  it("validates a compliant scope input successfully", () => {
    const { isValid, errors } = validateScopeInput(baseValidScope);
    expect(isValid).toBe(true);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("flags error when latitude is out of bounds", () => {
    const invalid = { ...baseValidScope, latitude: 105.0 };
    const { isValid, errors } = validateScopeInput(invalid);
    expect(isValid).toBe(false);
    expect(errors.latitude).toContain("-90 and 90");
  });

  it("flags error when end_date precedes start_date", () => {
    const invalid = { ...baseValidScope, start_date: "2020-12-31", end_date: "2020-01-01" };
    const { isValid, errors } = validateScopeInput(invalid);
    expect(isValid).toBe(false);
    expect(errors.dates).toContain("cannot be earlier");
  });

  it("flags error when system capacity is non-positive", () => {
    const invalid = { ...baseValidScope, system_capacity_kw: 0.0 };
    const { isValid, errors } = validateScopeInput(invalid);
    expect(isValid).toBe(false);
    expect(errors.system_capacity_kw).toContain("greater than 0");
  });

  it("flags error when installation cost is negative", () => {
    const invalid = { ...baseValidScope, installation_cost: -500.0 };
    const { isValid, errors } = validateScopeInput(invalid);
    expect(isValid).toBe(false);
    expect(errors.installation_cost).toContain("cannot be negative");
  });
});
