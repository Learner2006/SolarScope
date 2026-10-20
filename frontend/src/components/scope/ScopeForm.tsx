import React, { useState } from "react";
import { ScopeInput } from "../../types/analysis";
import { validateScopeInput, ScopeValidationErrors } from "../../utils/validation";
import { getCurrencySymbol } from "../../utils/formatting";
import { NumericSliderField } from "./NumericSliderField";
import { GLOBAL_CITIES, DEFAULT_CITY, CityLocation } from "../../config/cities";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { MapPin, Calendar, Sun, Play, ChevronDown, ChevronUp, Sliders, Compass } from "lucide-react";

interface ScopeFormProps {
  initialValues?: ScopeInput;
  onSubmit: (scope: ScopeInput, forceFixture: boolean) => void;
  isLoading: boolean;
}

export const ScopeForm: React.FC<ScopeFormProps> = ({ initialValues, onSubmit, isLoading }) => {
  const [selectedCity, setSelectedCity] = useState<CityLocation | null>(
    initialValues
      ? GLOBAL_CITIES.find(c =>
          (initialValues.location_name && c.name.toLowerCase() === initialValues.location_name.toLowerCase()) ||
          (Math.abs(c.latitude - initialValues.latitude) < 0.05 && Math.abs(c.longitude - initialValues.longitude) < 0.05)
        ) || {
          id: "custom", name: initialValues.location_name || "Custom Site", country: "", region: "",
          latitude: initialValues.latitude, longitude: initialValues.longitude,
          defaultTilt: initialValues.tilt_degrees, defaultAzimuth: initialValues.azimuth_degrees,
        }
      : DEFAULT_CITY
  );

  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [errors, setErrors] = useState<ScopeValidationErrors>({});

  const [scope, setScope] = useState<ScopeInput>(
    initialValues || {
      location_name: `${DEFAULT_CITY.name}, ${DEFAULT_CITY.country}`,
      latitude: DEFAULT_CITY.latitude,
      longitude: DEFAULT_CITY.longitude,
      start_date: "2019-01-01",
      end_date: "2019-12-31",
      system_capacity_kw: 5.0,
      tilt_degrees: DEFAULT_CITY.defaultTilt,
      azimuth_degrees: DEFAULT_CITY.defaultAzimuth,
      system_losses_pct: 10.0,
      installation_cost: 7500.0,
      import_tariff: 0.28,
      export_tariff: 0.06,
      self_consumption_pct: 65.0,
      annual_maintenance_cost: 75.0,
      project_lifetime_years: 25,
      currency_code: "USD",
    }
  );

  const update = <K extends keyof ScopeInput>(k: K, v: ScopeInput[K]) => setScope(p => ({ ...p, [k]: v }));

  const handleCitySelect = (c: CityLocation) => {
    setSelectedCity(c);
    setScope(p => ({
      ...p,
      location_name: `${c.name}, ${c.country}`,
      latitude: c.latitude,
      longitude: c.longitude,
      tilt_degrees: c.defaultTilt,
      azimuth_degrees: c.defaultAzimuth,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors: errs } = validateScopeInput(scope);
    if (!isValid) return setErrors(errs);
    setErrors({});
    onSubmit(scope, true);
  };

  const isBench = selectedCity?.isBenchmarkFixture ?? false;
  const curr = scope.currency_code || "USD";
  const sym = getCurrencySymbol(curr);
  const errStyle: React.CSSProperties = { color: "var(--rose-500)", fontSize: "0.75rem", marginTop: "0.5rem" };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "860px", margin: "0 auto" }}>
      {/* Simulation Engine Mode Banner */}
      <div className="card" style={{
        padding: "0.875rem 1.25rem", marginBottom: "1.25rem",
        backgroundColor: isBench ? "var(--emerald-50)" : "#f8fafc",
        border: isBench ? "1px solid var(--emerald-200)" : "1px solid #cbd5e1",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            fontSize: "0.8125rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "4px",
            backgroundColor: isBench ? "var(--emerald-100)" : "#e2e8f0", color: isBench ? "var(--emerald-900)" : "#334155"
          }}>
            {isBench ? "Local Benchmark Model" : "Astronomical Solar Estimate"}
          </span>
          <span style={{ fontSize: "0.8125rem", color: isBench ? "var(--emerald-800)" : "#475569" }}>
            {isBench
              ? "Using offline synthetic benchmark fixture for San Francisco, CA (2019 baseline, 8,760 hours in UTC)."
              : `Calculating celestial sun angles and theoretical clear-sky irradiance for ${selectedCity?.name || "selected coordinates"}.`}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: isLoading ? "var(--amber-500)" : "var(--emerald-500)", display: "inline-block" }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {isLoading ? "Executing Run..." : "Ready to Analyze"}
          </span>
        </div>
      </div>

      {/* 1. Location Selection */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <MapPin size={20} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>1. Project Location</h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          Select a city to resolve geographic coordinates and suggested panel orientation.
        </p>
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.35rem" }}>
            City Name or Region:
          </label>
          <LocationAutocomplete selectedCity={selectedCity} onSelectCity={handleCitySelect} />
        </div>

        {selectedCity && (
          <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", backgroundColor: "var(--bg-secondary)", padding: "0.625rem 0.875rem", borderRadius: "var(--radius-sm)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
              <Compass size={14} color="var(--emerald-600)" />
              <span>Suggested starting orientation: Tilt {selectedCity.defaultTilt}°, Azimuth {selectedCity.defaultAzimuth}°</span>
            </div>
            <div>
              Starting tilt reflects latitude rule-of-thumb (not an optimized angle). Azimuth convention: 180° = True South (optimal for Northern Hemisphere), 0° = True North (optimal for Southern Hemisphere).
            </div>
            {!selectedCity.isBenchmarkFixture && (
              <div style={{ marginTop: "0.35rem", color: "#64748b", fontStyle: "italic" }}>
                Notice: Calculations for this location use mathematical celestial angles and theoretical clear-sky irradiance. They do not incorporate historical local cloud cover or weather reanalysis.
              </div>
            )}
          </div>
        )}

        {selectedCity && (
          <div>
            <button
              type="button"
              onClick={() => setShowLocationDetails(!showLocationDetails)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8125rem", color: "var(--text-tertiary)", fontWeight: 500, background: "none", border: "none", padding: 0, cursor: "pointer" }}
            >
              {showLocationDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showLocationDetails ? "Hide technical site & coordinate details" : "Show technical site & coordinate details"}
            </button>
            {showLocationDetails && (
              <div style={{ marginTop: "0.5rem", padding: "0.75rem", backgroundColor: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", fontSize: "0.8125rem", color: "var(--text-secondary)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div><strong>Resolved Latitude:</strong> {selectedCity.latitude.toFixed(4)}° {selectedCity.latitude >= 0 ? "N" : "S"}</div>
                <div><strong>Resolved Longitude:</strong> {Math.abs(selectedCity.longitude).toFixed(4)}° {selectedCity.longitude >= 0 ? "E" : "W"}</div>
                <div><strong>Simulation Data Source:</strong> {selectedCity.isBenchmarkFixture ? "MERRA-2 2019 Reanalysis Fixture" : "SolarScope Theoretical Clear-Sky Model"}</div>
                <div><strong>Temporal Resolution:</strong> 8,760 Continuous Hourly Intervals (UTC)</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Analysis Period */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Calendar size={20} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>2. Analysis Period</h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
          {isBench
            ? "The San Francisco benchmark fixture covers calendar year 2019 (2019-01-01 to 2019-12-31, 8,760 continuous hourly intervals in UTC). Maximum period: 366 days."
            : `Continuous hourly simulation period in UTC timestamps for ${selectedCity?.name || "the selected location"}. Maximum single analysis period is 366 days.`}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {(["start_date", "end_date"] as const).map(k => (
            <div key={k}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                {k === "start_date" ? "Start Date" : "End Date"}
              </label>
              <input
                type="date"
                value={scope[k]}
                min="2019-01-01"
                max="2025-12-31"
                onChange={e => update(k, e.target.value)}
                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)" }}
              />
            </div>
          ))}
        </div>
        {errors.dates && <p style={errStyle}>{errors.dates}</p>}
      </div>

      {/* 3. System Capacity & Primary Economics */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <Sun size={20} color="var(--emerald-600)" />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>3. System Capacity & Primary Economics</h2>
        </div>

        {/* Currency Setting */}
        <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <label htmlFor="currency-select" style={{ fontSize: "0.875rem", fontWeight: 600, display: "block" }}>
                Financial Modeling Currency
              </label>
              <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                Economic unit of account. Physical solar geometry is strictly invariant to currency selection.
              </span>
            </div>
            <select
              id="currency-select"
              data-testid="currency-select"
              value={curr}
              onChange={e => update("currency_code", e.target.value)}
              style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", fontSize: "0.8125rem", fontWeight: 600, backgroundColor: "var(--bg-primary)", color: "var(--text-primary)", cursor: "pointer" }}
            >
              <option value="USD">USD ($) — US Dollar (Default / Benchmark)</option>
              <option value="INR">INR (₹) — Indian Rupee</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
            </select>
          </div>
        </div>

        <NumericSliderField
          label="Rated PV System Capacity"
          value={scope.system_capacity_kw}
          min={0.5} max={50.0} step={0.5} unit="kW"
          helpText="Nominal DC nameplate capacity. Scales simulated hourly power output proportionally."
          isAssumption={false}
          onChange={v => update("system_capacity_kw", v)}
        />
        {errors.system_capacity_kw && <p style={errStyle}>{errors.system_capacity_kw}</p>}

        <NumericSliderField
          label="Turnkey Capital Installation Cost"
          value={scope.installation_cost}
          min={500} max={50000} step={250} unit={curr}
          helpText={`User-assumed capital investment in ${curr}. Not an automatically retrieved local market quote.`}
          isAssumption={true}
          onChange={v => update("installation_cost", v)}
        />
        {errors.installation_cost && <p style={errStyle}>{errors.installation_cost}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <NumericSliderField
            label="Electricity Import Tariff"
            value={scope.import_tariff}
            min={0.01} max={50.0} step={0.01} unit={`${sym}/kWh`}
            helpText={`User-assumed retail utility price in ${curr}/kWh offset by self-consumed power.`}
            isAssumption={true}
            onChange={v => update("import_tariff", v)}
          />
          <NumericSliderField
            label="Grid Export / Feed-in Tariff"
            value={scope.export_tariff}
            min={0.0} max={25.0} step={0.01} unit={`${sym}/kWh`}
            helpText={`User-assumed utility compensation rate in ${curr}/kWh for surplus power injected into the grid.`}
            isAssumption={true}
            onChange={v => update("export_tariff", v)}
          />
        </div>

        <NumericSliderField
          label="Estimated On-Site Self-Consumption"
          value={scope.self_consumption_pct}
          min={0} max={100} step={5} unit="%"
          helpText="User-assumed percentage of solar electricity consumed directly on-site. Dependent on building occupancy patterns and daytime electrical loads."
          isAssumption={true}
          onChange={v => update("self_consumption_pct", v)}
        />
      </div>

      {/* 4. Advanced Technical Parameters */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sliders size={20} color="var(--emerald-600)" />
            <h2 style={{ fontSize: "1.05rem", fontWeight: 600 }}>4. Advanced Technical Parameters (Optional)</h2>
          </div>
          <button
            type="button"
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.8125rem", color: "var(--text-secondary)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
          >
            {showAdvancedSettings ? "Collapse" : "Expand"}
            {showAdvancedSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showAdvancedSettings && (
          <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-default)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <NumericSliderField
                label="Panel Tilt Angle"
                value={scope.tilt_degrees}
                min={0} max={70} step={1} unit="deg"
                helpText="Panel tilt angle relative to horizontal ground. Populated with a suggested rule-of-thumb starting angle matching site latitude."
                isAssumption={true}
                onChange={v => update("tilt_degrees", v)}
              />
              <NumericSliderField
                label="Panel Azimuth Orientation"
                value={scope.azimuth_degrees}
                min={0} max={360} step={5} unit="deg"
                helpText="Orientation relative to True North (180° = True South, 0° = True North, 90° = East, 270° = West)."
                isAssumption={true}
                onChange={v => update("azimuth_degrees", v)}
              />
            </div>

            <NumericSliderField
              label="Total System Losses"
              value={scope.system_losses_pct}
              min={0} max={35} step={1} unit="%"
              helpText="Total DC-to-AC derate from inverter inefficiency, wiring resistance, module mismatch, and soiling. The source simulation dataset embeds a 10% baseline derate; user input scales generation proportionally as (1 - Loss) / 0.90 so that losses are never double-counted."
              isAssumption={true}
              onChange={v => update("system_losses_pct", v)}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <NumericSliderField
                label="Annual Maintenance (O&M)"
                value={scope.annual_maintenance_cost}
                min={0} max={5000} step={10} unit={`${curr}/yr`}
                helpText={`User-assumed recurring annual operational cost in ${curr}/year for inspection, cleaning, and inverter replacement reserves.`}
                isAssumption={true}
                onChange={v => update("annual_maintenance_cost", v)}
              />
              <NumericSliderField
                label="Project Operational Lifetime"
                value={scope.project_lifetime_years}
                min={5} max={40} step={1} unit="years"
                helpText="Operational evaluation period in years. Used to calculate lifetime cumulative energy, total net cash flows, and whether simple payback is achieved within asset life."
                isAssumption={true}
                onChange={v => update("project_lifetime_years", v)}
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary"
        style={{ width: "100%", padding: "0.875rem", fontSize: "1rem", fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer" }}
      >
        <Play size={18} />
        {isLoading ? "Executing Feasibility Engine..." : "Run Solar Feasibility Analysis"}
      </button>
    </form>
  );
};
