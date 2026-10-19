import React, { useState } from "react";
import { ScopeInput } from "../../types/analysis";
import { validateScopeInput, ScopeValidationErrors } from "../../utils/validation";
import { NumericSliderField } from "./NumericSliderField";
import { SUPPORTED_LOCATIONS, DEFAULT_BENCHMARK_LOCATION } from "../../config/locations";
import {
  MapPin,
  Calendar,
  Sun,
  Play,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sliders,
} from "lucide-react";

interface ScopeFormProps {
  initialValues?: ScopeInput;
  onSubmit: (scope: ScopeInput, forceFixture: boolean) => void;
  isLoading: boolean;
}

export const ScopeForm: React.FC<ScopeFormProps> = ({
  initialValues,
  onSubmit,
  isLoading,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string>("san_francisco");
  const [showLocationDetails, setShowLocationDetails] = useState<boolean>(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  const [scope, setScope] = useState<ScopeInput>(
    initialValues || {
      location_name: DEFAULT_BENCHMARK_LOCATION.name,
      latitude: DEFAULT_BENCHMARK_LOCATION.latitude,
      longitude: DEFAULT_BENCHMARK_LOCATION.longitude,
      start_date: "2019-01-01",
      end_date: "2019-12-31",
      system_capacity_kw: 5.0,
      tilt_degrees: DEFAULT_BENCHMARK_LOCATION.defaultTilt,
      azimuth_degrees: DEFAULT_BENCHMARK_LOCATION.defaultAzimuth,
      system_losses_pct: 10.0,
      installation_cost: 7500.0,
      import_tariff: 0.28,
      export_tariff: 0.06,
      self_consumption_pct: 65.0,
      annual_maintenance_cost: 75.0,
      project_lifetime_years: 25,
    }
  );

  const [errors, setErrors] = useState<ScopeValidationErrors>({});

  const currentLocationConfig =
    SUPPORTED_LOCATIONS.find((loc) => loc.id === selectedLocationId) || DEFAULT_BENCHMARK_LOCATION;

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
    const loc = SUPPORTED_LOCATIONS.find((l) => l.id === locationId);
    if (loc && loc.isBenchmarkAvailable) {
      setScope((prev) => ({
        ...prev,
        location_name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
        tilt_degrees: loc.defaultTilt,
        azimuth_degrees: loc.defaultAzimuth,
      }));
    }
  };

  const updateField = <K extends keyof ScopeInput>(field: K, value: ScopeInput[K]) => {
    setScope((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateScopeInput(scope);
    if (!isValid) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    // In local benchmark mode, forceFixture is explicitly true to bypass live API requests
    onSubmit(scope, true);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Benchmark Mode Active Indicator */}
      <div
        className="card"
        style={{
          padding: "0.875rem 1.25rem",
          marginBottom: "1.25rem",
          backgroundColor: "var(--emerald-50)",
          border: "1px solid var(--emerald-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldCheck size={18} color="var(--emerald-700)" />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--emerald-900)" }}>
            Deterministic Benchmark Mode Active
          </span>
        </div>
        <span style={{ fontSize: "0.8125rem", color: "var(--emerald-800)" }}>
          Simulating with verified 8,760-hour hourly solar PV dataset • Live API requests bypassed
        </span>
      </div>

      {/* 1. Location Selection Section */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <MapPin size={20} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>1. Project Location</h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Select a supported benchmark site. Coordinates and atmospheric solar geometry are resolved internally.
        </p>

        {/* Location Selector Dropdown */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.35rem" }}>
            Select Location:
          </label>
          <select
            value={selectedLocationId}
            onChange={(e) => handleLocationChange(e.target.value)}
            style={{
              width: "100%",
              padding: "0.625rem 0.75rem",
              fontSize: "0.9375rem",
              fontWeight: 500,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            {SUPPORTED_LOCATIONS.map((loc) => (
              <option
                key={loc.id}
                value={loc.id}
                disabled={!loc.isBenchmarkAvailable}
              >
                {loc.name} {loc.isBenchmarkAvailable ? "✓ (Verified Benchmark Available)" : "— (Requires Live API Key — Unavailable in Benchmark Mode)"}
              </option>
            ))}
          </select>
        </div>

        {/* Location Status Card */}
        <div
          style={{
            padding: "0.875rem",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-default)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{currentLocationConfig.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {currentLocationConfig.description}
            </div>
          </div>
          <span className="badge badge-emerald" style={{ whiteSpace: "nowrap" }}>
            {currentLocationConfig.statusBadge}
          </span>
        </div>

        {/* Optional Collapsible Location Details */}
        <div style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            onClick={() => setShowLocationDetails(!showLocationDetails)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8125rem",
              color: "var(--text-tertiary)",
              fontWeight: 500,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            {showLocationDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showLocationDetails ? "Hide technical location details" : "Show technical site & coordinate details"}
          </button>

          {showLocationDetails && (
            <div
              style={{
                marginTop: "0.5rem",
                padding: "0.75rem",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
              }}
            >
              <div><strong>Internal Latitude:</strong> {currentLocationConfig.latitude.toFixed(4)}° N</div>
              <div><strong>Internal Longitude:</strong> {currentLocationConfig.longitude.toFixed(4)}° W</div>
              <div><strong>Atmospheric Model:</strong> MERRA-2 Grid Reanalysis</div>
              <div><strong>Benchmark Coverage:</strong> 8,760 Continuous Hourly Intervals</div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Analysis Period Section */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <Calendar size={20} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>2. Analysis Period</h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Pre-populated with the supported benchmark dataset year (2019-01-01 to 2019-12-31, 8,760 hours).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
              Start Date
            </label>
            <input
              type="date"
              value={scope.start_date}
              min="2019-01-01"
              max="2019-12-31"
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
              End Date
            </label>
            <input
              type="date"
              value={scope.end_date}
              min="2019-01-01"
              max="2019-12-31"
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

      {/* 3. Primary Solar System & Economic Scope */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Sun size={20} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>3. System Capacity & Primary Economics</h2>
        </div>

        <NumericSliderField
          label="Rated PV System Capacity"
          value={scope.system_capacity_kw}
          min={0.5}
          max={50.0}
          step={0.5}
          unit="kW"
          helpText="Nominal DC nameplate capacity. Scales simulated hourly power output proportionally."
          isAssumption={false}
          onChange={(v) => updateField("system_capacity_kw", v)}
        />
        {errors.system_capacity_kw && <p style={{ color: "var(--rose-500)", fontSize: "0.75rem" }}>{errors.system_capacity_kw}</p>}

        <NumericSliderField
          label="Turnkey Capital Installation Cost"
          value={scope.installation_cost}
          min={500}
          max={50000}
          step={250}
          unit="USD"
          helpText="Total capital investment including hardware, inverter, mounting, and installation labor."
          onChange={(v) => updateField("installation_cost", v)}
        />
        {errors.installation_cost && <p style={{ color: "var(--rose-500)", fontSize: "0.75rem" }}>{errors.installation_cost}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <NumericSliderField
            label="Electricity Import Tariff"
            value={scope.import_tariff}
            min={0.05}
            max={0.80}
            step={0.01}
            unit="$/kWh"
            helpText="Utility grid price displaced by self-consumed solar electricity."
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

        <NumericSliderField
          label="Estimated On-Site Self-Consumption"
          value={scope.self_consumption_pct}
          min={0}
          max={100}
          step={5}
          unit="%"
          helpText="Fraction of solar power consumed locally on-site (typical residential without battery: 40-70%)."
          onChange={(v) => updateField("self_consumption_pct", v)}
        />
      </div>

      {/* 4. Expandable Advanced Technical & Physical Parameters */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sliders size={20} color="var(--emerald-600)" />
            <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              4. Advanced Technical Parameters (Optional)
            </h2>
          </div>
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
              fontWeight: 500,
            }}
          >
            {showAdvancedSettings ? "Collapse" : "Expand"}
            {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showAdvancedSettings && (
          <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-default)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div>
                <NumericSliderField
                  label="Panel Tilt"
                  value={scope.tilt_degrees}
                  min={0}
                  max={70}
                  step={1}
                  unit="deg"
                  helpText="In benchmark mode, irradiance reflects the verified 30° tilt benchmark."
                  onChange={(v) => updateField("tilt_degrees", v)}
                />
              </div>

              <div>
                <NumericSliderField
                  label="Azimuth Orientation"
                  value={scope.azimuth_degrees}
                  min={0}
                  max={360}
                  step={5}
                  unit="deg"
                  helpText="In benchmark mode, irradiance reflects the 180° South-facing baseline."
                  onChange={(v) => updateField("azimuth_degrees", v)}
                />
              </div>
            </div>

            <NumericSliderField
              label="Estimated System Losses"
              value={scope.system_losses_pct}
              min={0}
              max={35}
              step={1}
              unit="%"
              helpText="Inverter, wiring, and soiling losses. Calculated as derate relative to 10% base derate."
              onChange={(v) => updateField("system_losses_pct", v)}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <NumericSliderField
                label="Annual Maintenance (O&M)"
                value={scope.annual_maintenance_cost}
                min={0}
                max={500}
                step={10}
                unit="$/yr"
                helpText="Routine inspection, cleaning, and inverter warranty reserve."
                onChange={(v) => updateField("annual_maintenance_cost", v)}
              />

              <NumericSliderField
                label="Project Lifetime"
                value={scope.project_lifetime_years}
                min={5}
                max={40}
                step={1}
                unit="years"
                helpText="Operational life used to calculate 25-yr net cash flows and payback achievability."
                onChange={(v) => updateField("project_lifetime_years", v)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Action */}
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
        {isLoading ? "Executing Feasibility Engine..." : "Run Solar Feasibility Analysis"}
      </button>
    </form>
  );
};
