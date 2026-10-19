import React, { useState } from "react";
import { ScopeInput } from "../../types/analysis";
import { validateScopeInput, ScopeValidationErrors } from "../../utils/validation";
import { NumericSliderField } from "./NumericSliderField";
import { MapPin, Sun, DollarSign, Play } from "lucide-react";

interface ScopeFormProps {
  initialValues?: ScopeInput;
  onSubmit: (scope: ScopeInput, forceFixture: boolean) => void;
  isLoading: boolean;
}

const PRESET_LOCATIONS = [
  { name: "San Francisco, CA", lat: 37.7749, lon: -122.4194, tilt: 30, azim: 180 },
  { name: "Phoenix, AZ", lat: 33.4484, lon: -112.0740, tilt: 25, azim: 180 },
  { name: "London, UK", lat: 51.5074, lon: -0.1278, tilt: 35, azim: 180 },
  { name: "Berlin, DE", lat: 52.5200, lon: 13.4050, tilt: 35, azim: 180 },
  { name: "Sydney, AU", lat: -33.8688, lon: 151.2093, tilt: 25, azim: 0 }, // North facing in southern hemisphere
];

export const ScopeForm: React.FC<ScopeFormProps> = ({
  initialValues,
  onSubmit,
  isLoading,
}) => {
  const [scope, setScope] = useState<ScopeInput>(
    initialValues || {
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
    }
  );

  const [forceFixture, setForceFixture] = useState(false);
  const [errors, setErrors] = useState<ScopeValidationErrors>({});

  const updateField = <K extends keyof ScopeInput>(field: K, value: ScopeInput[K]) => {
    setScope((prev) => ({ ...prev, [field]: value }));
  };

  const handlePresetSelect = (preset: typeof PRESET_LOCATIONS[0]) => {
    setScope((prev) => ({
      ...prev,
      location_name: preset.name,
      latitude: preset.lat,
      longitude: preset.lon,
      tilt_degrees: preset.tilt,
      azimuth_degrees: preset.azim,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateScopeInput(scope);
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    onSubmit(scope, forceFixture);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Location & Period Section */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <MapPin size={20} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>1. Location & Analysis Period</h2>
        </div>

        {/* Quick select presets */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: "0.5rem" }}>
            Benchmark Preset Locations:
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.8125rem",
                  padding: "0.35rem 0.75rem",
                  borderColor: scope.location_name === preset.name ? "var(--emerald-600)" : "var(--border-default)",
                  backgroundColor: scope.location_name === preset.name ? "var(--emerald-50)" : "var(--bg-primary)",
                  color: scope.location_name === preset.name ? "var(--emerald-700)" : "var(--text-secondary)",
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Latitude (decimal degrees)
            </label>
            <input
              type="number"
              step="0.0001"
              value={scope.latitude}
              onChange={(e) => updateField("latitude", parseFloat(e.target.value))}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
              }}
            />
            {errors.latitude && <p style={{ color: "var(--rose-500)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.latitude}</p>}
          </div>

          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Longitude (decimal degrees)
            </label>
            <input
              type="number"
              step="0.0001"
              value={scope.longitude}
              onChange={(e) => updateField("longitude", parseFloat(e.target.value))}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
              }}
            />
            {errors.longitude && <p style={{ color: "var(--rose-500)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{errors.longitude}</p>}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Start Date
            </label>
            <input
              type="date"
              value={scope.start_date}
              onChange={(e) => updateField("start_date", e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              End Date (max 366 days)
            </label>
            <input
              type="date"
              value={scope.end_date}
              onChange={(e) => updateField("end_date", e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-default)",
              }}
            />
          </div>
        </div>
        {errors.dates && <p style={{ color: "var(--rose-500)", fontSize: "0.75rem", marginTop: "0.5rem" }}>{errors.dates}</p>}
      </div>

      {/* PV System Specification Section */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Sun size={20} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>2. Solar PV System Configuration</h2>
        </div>

        <NumericSliderField
          label="Rated System Capacity"
          value={scope.system_capacity_kw}
          min={0.5}
          max={50.0}
          step={0.5}
          unit="kW"
          helpText="Nominal DC nameplate capacity of the solar array."
          isAssumption={false}
          onChange={(v) => updateField("system_capacity_kw", v)}
        />
        {errors.system_capacity_kw && <p style={{ color: "var(--rose-500)", fontSize: "0.75rem" }}>{errors.system_capacity_kw}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <NumericSliderField
            label="Panel Tilt"
            value={scope.tilt_degrees}
            min={0}
            max={70}
            step={1}
            unit="deg"
            helpText="0° = horizontal, 90° = vertical."
            onChange={(v) => updateField("tilt_degrees", v)}
          />

          <NumericSliderField
            label="Azimuth Orientation"
            value={scope.azimuth_degrees}
            min={0}
            max={360}
            step={5}
            unit="deg"
            helpText="180° = South, 90° = East, 270° = West."
            onChange={(v) => updateField("azimuth_degrees", v)}
          />
        </div>

        <NumericSliderField
          label="Estimated System Losses"
          value={scope.system_losses_pct}
          min={0}
          max={35}
          step={1}
          unit="%"
          helpText="Derate for inverter conversion, wiring resistance, and surface soiling (industry norm: 10-14%)."
          onChange={(v) => updateField("system_losses_pct", v)}
        />
      </div>

      {/* Financial Assumptions Section */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <DollarSign size={20} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>3. Financial & Economic Assumptions</h2>
        </div>

        <NumericSliderField
          label="Turnkey Installation Cost"
          value={scope.installation_cost}
          min={500}
          max={50000}
          step={250}
          unit="USD"
          helpText="Total capital expenditure including equipment, mounting, inverters, and labor."
          onChange={(v) => updateField("installation_cost", v)}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <NumericSliderField
            label="Electricity Import Tariff"
            value={scope.import_tariff}
            min={0.05}
            max={0.80}
            step={0.01}
            unit="$/kWh"
            helpText="Retail grid electricity price offset by on-site solar consumption."
            onChange={(v) => updateField("import_tariff", v)}
          />

          <NumericSliderField
            label="Grid Export / Feed-in Tariff"
            value={scope.export_tariff}
            min={0.0}
            max={0.40}
            step={0.01}
            unit="$/kWh"
            helpText="Compensation credited by the utility for exported surplus generation."
            onChange={(v) => updateField("export_tariff", v)}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <NumericSliderField
            label="Estimated Self-Consumption"
            value={scope.self_consumption_pct}
            min={0}
            max={100}
            step={5}
            unit="%"
            helpText="Fraction of solar power consumed locally (typical residential without battery: 40-70%)."
            onChange={(v) => updateField("self_consumption_pct", v)}
          />

          <NumericSliderField
            label="Annual Operations & Maintenance"
            value={scope.annual_maintenance_cost}
            min={0}
            max={500}
            step={10}
            unit="$/yr"
            helpText="Routine inspection, cleaning, and inverter warranty reserve."
            onChange={(v) => updateField("annual_maintenance_cost", v)}
          />
        </div>
      </div>

      {/* Data Source Configuration */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={forceFixture}
            onChange={(e) => setForceFixture(e.target.checked)}
            style={{ accentColor: "var(--emerald-600)" }}
          />
          <span>Force deterministic local benchmark fixture (bypass live API calls)</span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary"
        style={{
          width: "100%",
          padding: "0.875rem",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: isLoading ? "not-allowed" : "pointer",
        }}
      >
        <Play size={18} />
        {isLoading ? "Running Feasibility Engine..." : "Run Solar Feasibility Analysis"}
      </button>
    </form>
  );
};
