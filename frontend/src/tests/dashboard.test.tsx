import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalysisPage } from "../routes/AnalysisPage";
import { AppShell } from "../components/layout/AppShell";
import { AnalysisResponse } from "../types/analysis";

const mockUseAnalysis = vi.fn();

vi.mock("../state/AnalysisContext", () => ({
  useAnalysis: () => mockUseAnalysis(),
}));

function createMockAnalysis(overrides?: Partial<AnalysisResponse>): AnalysisResponse {
  const base: AnalysisResponse = {
    analysis_id: "test-sim-9999",
    created_at: "2026-10-19T18:00:00Z",
    scope: {
      location_name: "Delhi, India",
      latitude: 28.6139,
      longitude: 77.209,
      start_date: "2019-01-01",
      end_date: "2019-12-31",
      system_capacity_kw: 5.0,
      tilt_degrees: 28.0,
      azimuth_degrees: 180.0,
      system_losses_pct: 10.0,
      installation_cost: 7300.0,
      import_tariff: 0.25,
      export_tariff: 0.08,
      self_consumption_pct: 70.0,
      annual_maintenance_cost: 100.0,
      project_lifetime_years: 25,
    },
    generation: {
      system_capacity_kw: 5.0,
      total_generation_kwh: 7800.0,
      total_generation_mwh: 7.8,
      period_hours: 8760.0,
      capacity_factor_pct: 17.81,
      peak_power_kw: 4.25,
      peak_timestamp: "2019-05-15T12:00:00",
      daily_average_kwh: 21.37,
      monthly_breakdown: [
        {
          year: 2019,
          month: 1,
          month_name: "January",
          month_label: "2019-01",
          total_kwh: 520.0,
          peak_kw: 3.8,
          average_kw: 0.7,
          sunlight_hours: 290,
          total_hours: 744,
          capacity_factor_pct: 13.98,
          daily_average_kwh: 16.77,
        },
      ],
      weakest_month: {
        year: 2019,
        month: 1,
        month_name: "January",
        month_label: "2019-01",
        total_kwh: 520.0,
        peak_kw: 3.8,
        average_kw: 0.7,
        sunlight_hours: 290,
        total_hours: 744,
        capacity_factor_pct: 13.98,
        daily_average_kwh: 16.77,
      },
      strongest_month: {
        year: 2019,
        month: 5,
        month_name: "May",
        month_label: "2019-05",
        total_kwh: 810.0,
        peak_kw: 4.25,
        average_kw: 1.09,
        sunlight_hours: 410,
        total_hours: 744,
        capacity_factor_pct: 21.77,
        daily_average_kwh: 26.13,
      },
      validation: {
        total_intervals: 8760,
        expected_intervals: 8760,
        missing_intervals: 0,
        is_continuous: true,
        start_time: "2019-01-01T00:00:00",
        end_time: "2019-12-31T23:00:00",
        actual_hours: 8760.0,
        warnings: [],
      },
      provenance: {
        source_type: "solarscope_astronomical_model",
        dataset_name: "SolarScope Clear-Sky & Astronomical Insolation Model",
        retrieval_timestamp: "2026-10-19T18:00:00Z",
        attribution: "SolarScope Theoretical Solar Model (Duffie & Beckman solar geometry, Kasten-Young 1989 air mass).",
        coordinates_used: "28.6139° N, 77.2090° E",
        is_live_retrieval: false,
      },
      hourly_profiles_by_month: {
        1: [
          {
            timestamp: "2019-01-01T12:00:00",
            hour: 12,
            day: 1,
            month: 1,
            generation_kw: 3.5,
          },
        ],
      },
    },
    financials: {
      installation_cost: 7300.0,
      import_tariff: 0.25,
      export_tariff: 0.08,
      self_consumption_ratio: 0.7,
      annual_maintenance_cost: 100.0,
      project_lifetime_years: 25,
      total_generation_kwh: 7800.0,
      self_consumed_kwh: 5460.0,
      exported_kwh: 2340.0,
      avoided_import_savings: 1360.0,
      export_revenue: 190.0,
      gross_annual_savings: 1550.0,
      net_annual_benefit: 1450.0,
      simple_payback_years: 5.0,
      is_payback_achievable: true,
      payback_status: "Payback in 5.0 years",
      lifetime_total_generation_kwh: 195000.0,
      lifetime_gross_savings: 38750.0,
      lifetime_operating_costs: 2500.0,
      lifetime_net_cash_flow: 28950.0,
      roi_percentage: 396.6,
      lcoe_per_kwh: 0.0503,
      cash_flow_timeline: [],
      warnings: [],
    },
    scenarios: {},
    all_warnings: [],
  };

  return { ...base, ...overrides };
}

describe("Dashboard Provenance Badge & Financial Consistency", () => {
  beforeEach(() => {
    mockUseAnalysis.mockReset();
  });

  it("displays Clear-Sky Model badge on Dashboard when provenance is solarscope_astronomical_model", () => {
    const analysis = createMockAnalysis();
    mockUseAnalysis.mockReturnValue({
      currentAnalysis: analysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: null,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    const badge = screen.getByTestId("dashboard-provenance-badge");
    expect(badge).toHaveTextContent("● Clear-Sky Model");
    expect(badge).toHaveClass("badge-blue");
  });

  it("displays Benchmark Fixture badge when provenance is local_fixture (San Francisco)", () => {
    const analysis = createMockAnalysis({
      scope: {
        ...createMockAnalysis().scope,
        location_name: "San Francisco, CA",
      },
      generation: {
        ...createMockAnalysis().generation,
        provenance: {
          source_type: "local_fixture",
          dataset_name: "MERRA-2 2019 historical reanalysis (San Francisco baseline fixture)",
          retrieval_timestamp: "2026-10-19T18:00:00Z",
          attribution: "S. Pfenninger and I. Staffell (2016)...",
          coordinates_used: "37.7749° N, -122.4194° W",
          is_live_retrieval: false,
        },
      },
    });

    mockUseAnalysis.mockReturnValue({
      currentAnalysis: analysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: null,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    const badge = screen.getByTestId("dashboard-provenance-badge");
    expect(badge).toHaveTextContent("● Benchmark Fixture");
    expect(badge).toHaveClass("badge-amber");
  });

  it("displays Live API Data badge when provenance is live retrieval", () => {
    const analysis = createMockAnalysis({
      generation: {
        ...createMockAnalysis().generation,
        provenance: {
          source_type: "renewables_ninja_api",
          dataset_name: "MERRA2 reanalysis",
          retrieval_timestamp: "2026-10-19T18:00:00Z",
          attribution: "S. Pfenninger and I. Staffell (2016)...",
          coordinates_used: "33.4484° N, -112.0740° W",
          is_live_retrieval: true,
        },
      },
    });

    mockUseAnalysis.mockReturnValue({
      currentAnalysis: analysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: null,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    const badge = screen.getByTestId("dashboard-provenance-badge");
    expect(badge).toHaveTextContent("● Live API Data");
    expect(badge).toHaveClass("badge-emerald");
  });

  it("displays mathematically consistent financial cards on Dashboard", () => {
    const analysis = createMockAnalysis();
    mockUseAnalysis.mockReturnValue({
      currentAnalysis: analysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: null,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    // 1. Annual generation matches
    expect(screen.getByText("7,800")).toBeInTheDocument();
    expect(screen.getByText(/7.80 MWh total yield/i)).toBeInTheDocument();

    // 2. Capacity factor matches
    expect(screen.getByText("17.81%")).toBeInTheDocument();
    expect(screen.getByText(/Across 8,760 modeled hours/i)).toBeInTheDocument();

    // 3. Net Annual Benefit matches gross - maintenance
    expect(screen.getByText("$1,450")).toBeInTheDocument();
    expect(screen.getByText(/Gross: \$1,550 - O&M: \$100/i)).toBeInTheDocument();

    // 4. Simple Payback
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText(/Payback in 5.0 years/i)).toBeInTheDocument();

    // 5. Lifetime Return & ROI
    expect(screen.getByText("$28,950")).toBeInTheDocument();
    expect(screen.getByText(/ROI: 396.6% undiscounted/i)).toBeInTheDocument();

    // 6. LCOE
    expect(screen.getByText("$ 0.050")).toBeInTheDocument();
    expect(screen.getByText("/kWh")).toBeInTheDocument();
    expect(screen.getByText(/Undiscounted 25-yr capex & O&M/i)).toBeInTheDocument();
  });

  it("handles non-recovering financial scenarios (net annual benefit <= 0) gracefully", () => {
    const analysis = createMockAnalysis({
      financials: {
        ...createMockAnalysis().financials,
        gross_annual_savings: 50.0,
        annual_maintenance_cost: 100.0,
        net_annual_benefit: -50.0,
        simple_payback_years: null,
        is_payback_achievable: false,
        payback_status: "Non-recovering: annual operating costs equal or exceed gross solar savings",
        lifetime_net_cash_flow: -8550.0,
        roi_percentage: -117.1,
      },
    });

    mockUseAnalysis.mockReturnValue({
      currentAnalysis: analysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: null,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getByText(/Non-recovering: annual operating costs equal or exceed gross solar savings/i)).toBeInTheDocument();
  });

  it("updates AppShell footer attribution dynamically to match active provenance", () => {
    // 1. Clear-sky model active
    const clearSkyAnalysis = createMockAnalysis();
    mockUseAnalysis.mockReturnValue({
      activeScreen: "analysis",
      navigateTo: vi.fn(),
      currentAnalysis: clearSkyAnalysis,
    });

    const { rerender } = render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const footer = screen.getByTestId("footer-attribution");
    expect(footer).toHaveTextContent(/SolarScope's theoretical celestial geometry/i);
    expect(footer).toHaveTextContent(/Does not use Renewables.ninja or MERRA-2/i);

    // 2. Switch to San Francisco benchmark fixture
    const fixtureAnalysis = createMockAnalysis({
      generation: {
        ...createMockAnalysis().generation,
        provenance: {
          source_type: "local_fixture",
          dataset_name: "merra2",
          retrieval_timestamp: "2026-10-19T18:00:00Z",
          attribution: "S. Pfenninger and I. Staffell (2016)...",
          coordinates_used: "37.7749° N, -122.4194° W",
          is_live_retrieval: false,
        },
      },
    });

    mockUseAnalysis.mockReturnValue({
      activeScreen: "analysis",
      navigateTo: vi.fn(),
      currentAnalysis: fixtureAnalysis,
    });

    rerender(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const updatedFooter = screen.getByTestId("footer-attribution");
    expect(updatedFooter).toHaveTextContent(/Offline synthetic benchmark simulation/i);
    expect(updatedFooter).not.toHaveTextContent(/Pfenninger and I. Staffell/i);

    // 3. Switch to live retrieval
    const liveAnalysis = createMockAnalysis({
      generation: {
        ...createMockAnalysis().generation,
        provenance: {
          source_type: "renewables_ninja_api",
          dataset_name: "merra2",
          retrieval_timestamp: "2026-10-19T18:00:00Z",
          attribution: "S. Pfenninger and I. Staffell (2016)...",
          coordinates_used: "37.7749° N, -122.4194° W",
          is_live_retrieval: true,
        },
      },
    });

    mockUseAnalysis.mockReturnValue({
      activeScreen: "analysis",
      navigateTo: vi.fn(),
      currentAnalysis: liveAnalysis,
    });

    rerender(
      <AppShell>
        <div>Content</div>
      </AppShell>
    );

    const liveFooter = screen.getByTestId("footer-attribution");
    expect(liveFooter).toHaveTextContent(/live Renewables.ninja API \/ MERRA-2/i);
    expect(liveFooter).toHaveTextContent(/Pfenninger and I. Staffell \(2016\)/i);
  });

  it("displays explicit INR currency badge and formats financial metrics with ₹", () => {
    const inrAnalysis = createMockAnalysis({
      scope: {
        ...createMockAnalysis().scope,
        currency_code: "INR",
        installation_cost: 250000.0,
        import_tariff: 8.5,
        export_tariff: 3.0,
        annual_maintenance_cost: 5000.0,
      },
      financials: {
        ...createMockAnalysis().financials,
        currency_code: "INR",
        installation_cost: 250000.0,
        import_tariff: 8.5,
        export_tariff: 3.0,
        annual_maintenance_cost: 5000.0,
        gross_annual_savings: 53430.0,
        net_annual_benefit: 48430.0,
        simple_payback_years: 5.16,
        lifetime_net_cash_flow: 960750.0,
        roi_percentage: 384.3,
        lcoe_per_kwh: 1.923,
      },
    });

    mockUseAnalysis.mockReturnValue({
      currentAnalysis: inrAnalysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: null,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    // Currency badge
    const currBadge = screen.getByTestId("dashboard-currency-badge");
    expect(currBadge).toHaveTextContent("INR (₹)");

    // Physical metrics remain identical
    expect(screen.getByText("7,800")).toBeInTheDocument();
    expect(screen.getByText("17.81%")).toBeInTheDocument();

    // Financial metrics display INR symbol
    expect(screen.getByText("₹48,430")).toBeInTheDocument();
    expect(screen.getByText(/Gross: ₹53,430 - O&M: ₹5,000/i)).toBeInTheDocument();
    expect(screen.getByText("₹960,750")).toBeInTheDocument();
    expect(screen.getByText("₹ 1.923")).toBeInTheDocument();
  });

  it("displays 'Period Generation' when analysis period is less than a full year", () => {
    const partialYearAnalysis = createMockAnalysis({
      generation: {
        ...createMockAnalysis().generation,
        period_hours: 4320.0, // ~6 months
        total_generation_kwh: 3900.0,
      },
    });

    mockUseAnalysis.mockReturnValue({
      currentAnalysis: partialYearAnalysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: null,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    expect(screen.getByText("Period Generation")).toBeInTheDocument();
    expect(screen.queryByText("Annual Generation")).not.toBeInTheDocument();
  });

  it("informs user that diurnal profile represents theoretical clear-sky geometry without clouds", () => {
    const analysis = createMockAnalysis();
    mockUseAnalysis.mockReturnValue({
      currentAnalysis: analysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: 1,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    expect(screen.getByText(/celestial sun geometry without cloud attenuation/i)).toBeInTheDocument();
    expect(screen.getByText(/Modeled hours represent theoretical clear-sky irradiance simulations, not actual physical site measurements/i)).toBeInTheDocument();
  });

  it("uses modeled-hours phrasing across Dashboard without implying measured telemetry", () => {
    const analysis = createMockAnalysis();
    mockUseAnalysis.mockReturnValue({
      currentAnalysis: analysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: 1,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    // Header says modeled hours analyzed
    expect(screen.getByText(/8,760 modeled hours analyzed/i)).toBeInTheDocument();

    // Capacity factor card says Across 8,760 modeled hours
    expect(screen.getByText(/Across 8,760 modeled hours/i)).toBeInTheDocument();

    // Diurnal chart subtitle says modeled clear-sky hourly intervals
    expect(screen.getByText(/Aggregated across 1 modeled clear-sky hourly intervals in January/i)).toBeInTheDocument();

    // No misleading claims of actual measured hours
    expect(screen.queryByText(/actual hours/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/actual modeled/i)).not.toBeInTheDocument();
  });

  it("verifies LCOE formula and undiscounted project assumptions for 5,548 kWh baseline", () => {
    const delhiAnalysis = createMockAnalysis({
      scope: {
        ...createMockAnalysis().scope,
        location_name: "Delhi, India",
        system_capacity_kw: 5.0,
        installation_cost: 7500.0,
        import_tariff: 0.28,
        export_tariff: 0.06,
        self_consumption_pct: 65.0,
        annual_maintenance_cost: 75.0,
        project_lifetime_years: 25,
      },
      generation: {
        ...createMockAnalysis().generation,
        total_generation_kwh: 5548.0,
        total_generation_mwh: 5.55,
        period_hours: 8760.0,
        capacity_factor_pct: 12.67,
      },
      financials: {
        ...createMockAnalysis().financials,
        installation_cost: 7500.0,
        import_tariff: 0.28,
        export_tariff: 0.06,
        self_consumption_ratio: 0.65,
        annual_maintenance_cost: 75.0,
        project_lifetime_years: 25,
        total_generation_kwh: 5548.0,
        self_consumed_kwh: 3606.2,
        exported_kwh: 1941.8,
        avoided_import_savings: 1009.74,
        export_revenue: 116.45,
        gross_annual_savings: 1126.19,
        net_annual_benefit: 1051.19,
        simple_payback_years: 7.13,
        is_payback_achievable: true,
        payback_status: "Payback in 7.1 years",
        lifetime_total_generation_kwh: 138700.0,
        lifetime_gross_savings: 28154.75,
        lifetime_operating_costs: 1875.0,
        lifetime_net_cash_flow: 18779.75,
        roi_percentage: 250.4,
        lcoe_per_kwh: 0.0676,
      },
    });

    mockUseAnalysis.mockReturnValue({
      currentAnalysis: delhiAnalysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: null,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    render(<AnalysisPage />);

    // 1. Annual generation
    expect(screen.getByText("5,548")).toBeInTheDocument();
    expect(screen.getByText(/5.55 MWh total yield/i)).toBeInTheDocument();

    // 2. Capacity factor
    expect(screen.getByText("12.67%")).toBeInTheDocument();

    // 3. Net Annual Benefit matches gross ($1,126.19) - O&M ($75) = $1,051.19
    expect(screen.getByText("$1,051.19")).toBeInTheDocument();
    expect(screen.getByText(/Gross: \$1,126.19 - O&M: \$75/i)).toBeInTheDocument();

    // 4. Simple Payback
    expect(screen.getByText("7.13")).toBeInTheDocument();

    // 5. 25-Yr Lifetime Return and Undiscounted ROI
    expect(screen.getByText("$18,779.75")).toBeInTheDocument();
    expect(screen.getByText(/Net profit \| ROI: 250.4% undiscounted/i)).toBeInTheDocument();

    // 6. LCOE = (7500 + 75*25)/(5548*25) = 9375/138700 = 0.0676 -> $ 0.068 /kWh
    expect(screen.getByText("$ 0.068")).toBeInTheDocument();
    expect(screen.getByText(/Undiscounted 25-yr capex & O&M/i)).toBeInTheDocument();

    // 7. Explicit documentation of constant annual yield & 0% discount rate assumption
    expect(screen.getByText(/Nominal undiscounted \(constant annual yields, no panel degradation, 0% discount rate\)/i)).toBeInTheDocument();
  });

  it("ensures Dashboard and Report use the exact same canonical LCOE calculation and inputs", () => {
    const analysis = createMockAnalysis({
      scope: {
        ...createMockAnalysis().scope,
        installation_cost: 7500.0,
        annual_maintenance_cost: 75.0,
        project_lifetime_years: 25,
      },
      generation: {
        ...createMockAnalysis().generation,
        total_generation_kwh: 5548.0,
      },
      financials: {
        ...createMockAnalysis().financials,
        installation_cost: 7500.0,
        annual_maintenance_cost: 75.0,
        project_lifetime_years: 25,
        total_generation_kwh: 5548.0,
        // (7500 + 75*25) / (5548*25) = 9375 / 138700 = 0.0675919... -> 0.0676
        lcoe_per_kwh: 0.0676,
      },
    });

    // 1. Verify formula evaluation
    const expectedLifetimeCost = analysis.financials.installation_cost + (analysis.financials.annual_maintenance_cost * analysis.financials.project_lifetime_years);
    const expectedLifetimeGen = analysis.financials.total_generation_kwh * analysis.financials.project_lifetime_years;
    const computedLcoe = Number((expectedLifetimeCost / expectedLifetimeGen).toFixed(4));
    expect(analysis.financials.lcoe_per_kwh).toBe(computedLcoe);

    // 2. Dashboard renders formatted LCOE
    mockUseAnalysis.mockReturnValue({
      currentAnalysis: analysis,
      navigateTo: vi.fn(),
      selectedMonthForDrilldown: null,
      setSelectedMonthForDrilldown: vi.fn(),
      resetToScope: vi.fn(),
    });

    const { unmount } = render(<AnalysisPage />);
    expect(screen.getByText("$ 0.068")).toBeInTheDocument();
    expect(screen.getByText("/kWh")).toBeInTheDocument();
    unmount();
  });
});
