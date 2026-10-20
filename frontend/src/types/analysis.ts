export interface ScopeInput {
  location_name?: string;
  latitude: number;
  longitude: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  system_capacity_kw: number;
  tilt_degrees: number;
  azimuth_degrees: number;
  system_losses_pct: number;
  installation_cost: number;
  import_tariff: number;
  export_tariff: number;
  self_consumption_pct: number;
  annual_maintenance_cost: number;
  project_lifetime_years: number;
  currency_code?: string;
}

export interface MonthlyMetric {
  year: number;
  month: number;
  month_name: string;
  month_label: string;
  total_kwh: number;
  peak_kw: number;
  average_kw: number;
  sunlight_hours: number;
  total_hours: number;
  capacity_factor_pct: number;
  daily_average_kwh: number;
}

export interface HourlyPoint {
  timestamp: string;
  hour: number;
  day: number;
  month: number;
  generation_kw: number;
}

export interface ValidationReport {
  total_intervals: number;
  expected_intervals: number;
  missing_intervals: number;
  is_continuous: boolean;
  start_time: string | null;
  end_time: string | null;
  actual_hours: number;
  warnings: string[];
}

export interface Provenance {
  source_type: string;
  dataset_name: string;
  retrieval_timestamp: string;
  attribution: string;
  coordinates_used: string;
  is_live_retrieval: boolean;
}

export interface GenerationResponse {
  system_capacity_kw: number;
  total_generation_kwh: number;
  total_generation_mwh: number;
  period_hours: number;
  capacity_factor_pct: number;
  peak_power_kw: number;
  peak_timestamp: string | null;
  daily_average_kwh: number;
  monthly_breakdown: MonthlyMetric[];
  weakest_month: MonthlyMetric;
  strongest_month: MonthlyMetric;
  validation: ValidationReport;
  provenance: Provenance;
  hourly_profiles_by_month: Record<number, HourlyPoint[]>;
}

export interface CashFlowPoint {
  year: number;
  net_annual_cash_flow: number;
  cumulative_cash_flow: number;
}

export interface FinancialResponse {
  installation_cost: number;
  import_tariff: number;
  export_tariff: number;
  self_consumption_ratio: number;
  annual_maintenance_cost: number;
  project_lifetime_years: number;
  total_generation_kwh: number;
  self_consumed_kwh: number;
  exported_kwh: number;
  avoided_import_savings: number;
  export_revenue: number;
  gross_annual_savings: number;
  net_annual_benefit: number;
  simple_payback_years: number | null;
  is_payback_achievable: boolean;
  payback_status: string;
  lifetime_total_generation_kwh: number;
  lifetime_gross_savings: number;
  lifetime_operating_costs: number;
  lifetime_net_cash_flow: number;
  roi_percentage: number;
  lcoe_per_kwh: number;
  currency_code?: string;
  cash_flow_timeline: CashFlowPoint[];
  warnings: string[];
}

export interface ScenarioRequest {
  scenario_id: string;
  scenario_name: string;
  description: string;
  generation_pct_adjustment?: number;
  installation_cost_override?: number;
  import_tariff_override?: number;
  export_tariff_override?: number;
  self_consumption_pct_override?: number;
}

export interface ScenarioDelta {
  generation_diff_kwh: number;
  generation_diff_pct: number;
  gross_savings_diff_usd: number;
  gross_savings_diff_pct: number;
  net_annual_benefit_diff_usd: number;
  payback_diff_years: number | null;
  lifetime_cash_flow_diff_usd: number;
  lifetime_cash_flow_diff_pct: number;
  summary_message: string;
}

export interface ScenarioResponse {
  scenario_id: string;
  scenario_name: string;
  description: string;
  baseline_financials: FinancialResponse;
  scenario_financials: FinancialResponse;
  delta: ScenarioDelta;
  warnings: string[];
}

export interface AnalysisResponse {
  analysis_id: string;
  created_at: string;
  scope: ScopeInput;
  generation: GenerationResponse;
  financials: FinancialResponse;
  scenarios: Record<string, ScenarioResponse>;
  all_warnings: string[];
}

export interface AnalysisSummary {
  analysis_id: string;
  created_at: string;
  location_name?: string;
  system_capacity_kw: number;
  total_generation_kwh: number;
  capacity_factor_pct: number;
  net_annual_benefit: number;
  simple_payback_years: number | null;
  is_live_retrieval: boolean;
}

export interface ReportResponse {
  analysis_id: string;
  generated_at: string;
  scope: ScopeInput;
  generation: GenerationResponse;
  financials: FinancialResponse;
  scenarios: ScenarioResponse[];
  provenance: Provenance;
  formulas_and_methodology: Record<string, string>;
  model_limitations: string[];
  data_quality_warnings: string[];
  conclusions: string[];
}
