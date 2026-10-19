import { ScopeInput } from "../types/analysis";

export interface ScopeValidationErrors {
  latitude?: string;
  longitude?: string;
  dates?: string;
  system_capacity_kw?: string;
  installation_cost?: string;
  import_tariff?: string;
  export_tariff?: string;
  self_consumption_pct?: string;
  general?: string;
}

export function validateScopeInput(input: ScopeInput): { isValid: boolean; errors: ScopeValidationErrors } {
  const errors: ScopeValidationErrors = {};

  if (input.latitude < -90 || input.latitude > 90 || isNaN(input.latitude)) {
    errors.latitude = "Latitude must be between -90 and 90 degrees.";
  }

  if (input.longitude < -180 || input.longitude > 180 || isNaN(input.longitude)) {
    errors.longitude = "Longitude must be between -180 and 180 degrees.";
  }

  if (!input.start_date || !input.end_date) {
    errors.dates = "Start and end dates are required.";
  } else {
    const start = new Date(input.start_date);
    const end = new Date(input.end_date);
    if (end < start) {
      errors.dates = "End date cannot be earlier than start date.";
    } else {
      const days = (end.getTime() - start.getTime()) / (1000 * 3600 * 24) + 1;
      if (days > 366) {
        errors.dates = "Analysis period cannot exceed 366 days (1 year max per simulation).";
      }
    }
  }

  if (input.system_capacity_kw <= 0 || isNaN(input.system_capacity_kw)) {
    errors.system_capacity_kw = "System capacity must be greater than 0 kW.";
  } else if (input.system_capacity_kw > 1000) {
    errors.system_capacity_kw = "System capacity cannot exceed 1,000 kW for site-level analysis.";
  }

  if (input.installation_cost < 0 || isNaN(input.installation_cost)) {
    errors.installation_cost = "Installation cost cannot be negative.";
  }

  if (input.import_tariff < 0 || isNaN(input.import_tariff)) {
    errors.import_tariff = "Import tariff cannot be negative.";
  }

  if (input.export_tariff < 0 || isNaN(input.export_tariff)) {
    errors.export_tariff = "Export tariff cannot be negative.";
  }

  if (input.self_consumption_pct < 0 || input.self_consumption_pct > 100 || isNaN(input.self_consumption_pct)) {
    errors.self_consumption_pct = "Self-consumption must be between 0% and 100%.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
