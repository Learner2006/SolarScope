import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ScenarioResponse } from "../../types/analysis";
import { formatCurrency, formatNumber, formatPercent, getCurrencySymbol } from "../../utils/formatting";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface ScenarioComparisonChartProps {
  scenario: ScenarioResponse;
}

export const ScenarioComparisonChart: React.FC<ScenarioComparisonChartProps> = ({ scenario }) => {
  const { baseline_financials: base, scenario_financials: scen, delta } = scenario;
  const currency = base.currency_code || scen.currency_code || "USD";
  const currSym = getCurrencySymbol(currency);

  // Chart data for comparison
  const comparisonData = [
    {
      metric: "Gross Savings",
      Baseline: base.gross_annual_savings,
      Scenario: scen.gross_annual_savings,
      unit: `${currSym}/yr`,
    },
    {
      metric: "Net Annual Benefit",
      Baseline: base.net_annual_benefit,
      Scenario: scen.net_annual_benefit,
      unit: `${currSym}/yr`,
    },
    {
      metric: "Turnkey Cost",
      Baseline: base.installation_cost,
      Scenario: scen.installation_cost,
      unit: currSym,
    },
  ];

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Scenario header banner */}
      <div
        className="card"
        style={{
          padding: "1.25rem",
          marginBottom: "1.5rem",
          backgroundColor: "var(--bg-secondary)",
          borderLeft: "4px solid var(--emerald-600)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
          <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Scenario: {scenario.scenario_name}
          </h4>
          <span className="badge badge-emerald">Isolated Sensitivity</span>
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          {scenario.description}
        </p>
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "var(--bg-primary)",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "var(--emerald-800)",
            border: "1px solid var(--emerald-100)",
          }}
        >
          {delta.summary_message}
        </div>
      </div>

      {/* Delta Metrics Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Payback Delta */}
        <div className="card" style={{ padding: "1rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>
            Payback Period
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {scen.simple_payback_years !== null ? `${scen.simple_payback_years} yrs` : "N/A"}
            </span>
            {delta.payback_diff_years !== null && (
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  color: delta.payback_diff_years > 0 ? "var(--rose-500)" : "var(--emerald-600)",
                }}
              >
                {delta.payback_diff_years > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {delta.payback_diff_years > 0 ? `+${delta.payback_diff_years}` : delta.payback_diff_years} yrs
              </span>
            )}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            Baseline: {base.simple_payback_years !== null ? `${base.simple_payback_years} yrs` : "N/A"}
          </span>
        </div>

        {/* Net Annual Benefit Delta */}
        <div className="card" style={{ padding: "1rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>
            Net Annual Benefit
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {formatCurrency(scen.net_annual_benefit, currency)}/yr
            </span>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                color: delta.net_annual_benefit_diff_usd >= 0 ? "var(--emerald-600)" : "var(--rose-500)",
              }}
            >
              {delta.net_annual_benefit_diff_usd >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {delta.net_annual_benefit_diff_usd >= 0 ? `+${currSym}${delta.net_annual_benefit_diff_usd}` : `-${currSym}${Math.abs(delta.net_annual_benefit_diff_usd)}`}
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            Baseline: {formatCurrency(base.net_annual_benefit, currency)}/yr
          </span>
        </div>

        {/* Lifetime Cash Flow Delta */}
        <div className="card" style={{ padding: "1rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 600 }}>
            25-Yr Lifetime Net Return
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {formatCurrency(scen.lifetime_net_cash_flow, currency)}
            </span>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                color: delta.lifetime_cash_flow_diff_usd >= 0 ? "var(--emerald-600)" : "var(--rose-500)",
              }}
            >
              {delta.lifetime_cash_flow_diff_usd >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {delta.lifetime_cash_flow_diff_usd >= 0 ? `+${currSym}${delta.lifetime_cash_flow_diff_usd}` : `-${currSym}${Math.abs(delta.lifetime_cash_flow_diff_usd)}`}
            </span>
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            Baseline: {formatCurrency(base.lifetime_net_cash_flow, currency)}
          </span>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
          Baseline vs. Scenario Financial Comparison
        </h4>
        <div style={{ height: "260px", width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="metric" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={{ stroke: "var(--border-default)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} axisLine={{ stroke: "var(--border-default)" }} tickLine={false} tickFormatter={(v) => `${currSym}${v.toLocaleString()}`} />
              <Tooltip formatter={(value: any) => [`${currSym}${Number(value).toLocaleString()}`, ""]} />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="Baseline" fill="var(--border-hover)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Scenario" fill="var(--emerald-600)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Side-by-Side Comparison Table */}
      <div className="card" style={{ padding: "1.5rem", overflowX: "auto" }}>
        <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>
          Detailed Traceability Comparison Table
        </h4>
        <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border-default)", textAlign: "left" }}>
              <th style={{ padding: "0.75rem 0.5rem" }}>Metric</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Baseline (Immutable)</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Scenario Value</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Absolute Difference</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>% Difference</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Turnkey Capital Cost</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{formatCurrency(base.installation_cost, currency)}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{formatCurrency(scen.installation_cost, currency)}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{formatCurrency(scen.installation_cost - base.installation_cost, currency)}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>
                {base.installation_cost > 0 ? formatPercent((scen.installation_cost - base.installation_cost) / base.installation_cost, true) : "—"}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Retail Import Tariff</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{currSym} {base.import_tariff.toFixed(3)}/kWh</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{currSym} {scen.import_tariff.toFixed(3)}/kWh</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{currSym} {(scen.import_tariff - base.import_tariff).toFixed(3)}/kWh</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>
                {base.import_tariff > 0 ? formatPercent((scen.import_tariff - base.import_tariff) / base.import_tariff, true) : "—"}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Annual Generation</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{formatNumber(base.total_generation_kwh, 0)} kWh</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{formatNumber(scen.total_generation_kwh, 0)} kWh</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{delta.generation_diff_kwh > 0 ? `+${delta.generation_diff_kwh}` : delta.generation_diff_kwh} kWh</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{delta.generation_diff_pct}%</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Gross Annual Savings</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{formatCurrency(base.gross_annual_savings, currency)}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{formatCurrency(scen.gross_annual_savings, currency)}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{delta.gross_savings_diff_usd > 0 ? `+${currSym}${delta.gross_savings_diff_usd}` : `-${currSym}${Math.abs(delta.gross_savings_diff_usd)}`}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{delta.gross_savings_diff_pct}%</td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>Simple Payback Period</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{base.simple_payback_years !== null ? `${base.simple_payback_years} yrs` : "N/A"}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{scen.simple_payback_years !== null ? `${scen.simple_payback_years} yrs` : "N/A"}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>
                {delta.payback_diff_years !== null ? (delta.payback_diff_years > 0 ? `+${delta.payback_diff_years} yrs` : `${delta.payback_diff_years} yrs`) : "N/A"}
              </td>
              <td style={{ padding: "0.6rem 0.5rem" }}>—</td>
            </tr>
            <tr>
              <td style={{ padding: "0.6rem 0.5rem", fontWeight: 500 }}>25-Year Net Cash Flow</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{formatCurrency(base.lifetime_net_cash_flow, currency)}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{formatCurrency(scen.lifetime_net_cash_flow, currency)}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{delta.lifetime_cash_flow_diff_usd > 0 ? `+${currSym}${delta.lifetime_cash_flow_diff_usd}` : `-${currSym}${Math.abs(delta.lifetime_cash_flow_diff_usd)}`}</td>
              <td style={{ padding: "0.6rem 0.5rem" }}>{delta.lifetime_cash_flow_diff_pct}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
