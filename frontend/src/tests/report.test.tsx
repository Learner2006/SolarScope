import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportDocument } from "../components/report/ReportDocument";
import { ReportResponse } from "../types/analysis";

describe("ReportDocument Component", () => {
  const mockReport: ReportResponse = {
    analysis_id: "test-run-uuid-12345",
    generated_at: "2026-10-19T17:00:00Z",
    scope: {
      location_name: "San Francisco Benchmark",
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
    },
    generation: {
      system_capacity_kw: 5.0,
      total_generation_kwh: 7500.0,
      total_generation_mwh: 7.5,
      period_hours: 8760.0,
      capacity_factor_pct: 17.1,
      peak_power_kw: 4.1,
      peak_timestamp: "2019-06-21T12:00:00",
      daily_average_kwh: 20.55,
      monthly_breakdown: [
        {
          year: 2019,
          month: 1,
          month_name: "January",
          month_label: "2019-01",
          total_kwh: 400.0,
          peak_kw: 3.2,
          average_kw: 0.54,
          sunlight_hours: 280,
          total_hours: 744,
          capacity_factor_pct: 10.8,
          daily_average_kwh: 12.9,
        },
      ],
      weakest_month: {
        year: 2019,
        month: 12,
        month_name: "December",
        month_label: "2019-12",
        total_kwh: 350.0,
        peak_kw: 2.9,
        average_kw: 0.47,
        sunlight_hours: 260,
        total_hours: 744,
        capacity_factor_pct: 9.4,
        daily_average_kwh: 11.3,
      },
      strongest_month: {
        year: 2019,
        month: 7,
        month_name: "July",
        month_label: "2019-07",
        total_kwh: 850.0,
        peak_kw: 4.1,
        average_kw: 1.14,
        sunlight_hours: 420,
        total_hours: 744,
        capacity_factor_pct: 22.8,
        daily_average_kwh: 27.4,
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
        source_type: "local_fixture",
        dataset_name: "merra2",
        retrieval_timestamp: "2026-10-19T17:00:00Z",
        attribution: "Pfenninger & Staffell (2016)",
        coordinates_used: "37.7749° N, -122.4194° W",
        is_live_retrieval: false,
      },
      hourly_profiles_by_month: {},
    },
    financials: {
      installation_cost: 7500.0,
      import_tariff: 0.28,
      export_tariff: 0.06,
      self_consumption_ratio: 0.65,
      annual_maintenance_cost: 75.0,
      project_lifetime_years: 25,
      total_generation_kwh: 7500.0,
      self_consumed_kwh: 4875.0,
      exported_kwh: 2625.0,
      avoided_import_savings: 1365.0,
      export_revenue: 157.5,
      gross_annual_savings: 1522.5,
      net_annual_benefit: 1447.5,
      simple_payback_years: 5.2,
      is_payback_achievable: true,
      payback_status: "Payback in 5.2 years",
      lifetime_total_generation_kwh: 187500.0,
      lifetime_gross_savings: 38062.5,
      lifetime_operating_costs: 1875.0,
      lifetime_net_cash_flow: 28687.5,
      roi_percentage: 382.5,
      lcoe_per_kwh: 0.05,
      cash_flow_timeline: [],
      warnings: [],
    },
    scenarios: [],
    provenance: {
      source_type: "local_fixture",
      dataset_name: "merra2",
      retrieval_timestamp: "2026-10-19T17:00:00Z",
      attribution: "Pfenninger & Staffell (2016)",
      coordinates_used: "37.7749° N, -122.4194° W",
      is_live_retrieval: false,
    },
    formulas_and_methodology: {
      "Capacity Factor (CF)": "CF = Total Generation (kWh) / (System Capacity (kW) * Hours)",
    },
    model_limitations: ["Physical roof integrity must be surveyed on-site."],
    data_quality_warnings: [],
    conclusions: [
      "Under the stated financial assumptions, the modeled simple payback is approximately 5.2 years, within the assumed 25-year project lifetime.",
    ],
  };

  it("renders report with accurate run ID, cautious conclusion wording, and canonical LCOE", () => {
    render(<ReportDocument report={mockReport} />);
    expect(screen.getByText(/test-run-uuid-12345/i)).toBeInTheDocument();
    expect(screen.getByText(/Under the stated financial assumptions, the modeled simple payback is approximately 5.2 years/i)).toBeInTheDocument();
    expect(screen.getByText(/Pfenninger & Staffell/i)).toBeInTheDocument();

    // Verify canonical LCOE displayed in system & economic parameters table
    expect(screen.getByText("$ 0.050/kWh")).toBeInTheDocument();
    expect(screen.getByText("Modeled Currency:")).toBeInTheDocument();
    expect(screen.getByText("USD ($)")).toBeInTheDocument();
  });

  it("renders all five numbered sections in sequence with no missing section 3 when scenarios are empty", () => {
    render(<ReportDocument report={mockReport} />);

    // Verify sections 1 through 5 are all rendered in continuous order
    expect(screen.getByText(/1\. System Configuration & Economic Parameters/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Monthly Solar Generation Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Evaluated Sensitivity Scenarios/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Formulas & Calculation Methodology/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Known Limitations & Technical Scope/i)).toBeInTheDocument();

    // Verify empty scenario informative message
    expect(
      screen.getByText(/No sensitivity scenarios evaluated for this run/i)
    ).toBeInTheDocument();
  });

  it("renders provenance labels with proper traceability metadata in ProvenanceTable", () => {
    render(<ReportDocument report={mockReport} />);

    expect(screen.getByText("Source Mode:")).toBeInTheDocument();
    expect(screen.getByText("Dataset / Methodology:")).toBeInTheDocument();
    expect(screen.getByText("Retrieval Timestamp:")).toBeInTheDocument();
    expect(screen.getByText("Coordinates Evaluated:")).toBeInTheDocument();
    expect(screen.getByText("Attribution Citation:")).toBeInTheDocument();
  });
});
