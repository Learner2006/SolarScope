import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { MonthlyMetric } from "../../types/analysis";

interface MonthlyGenerationChartProps {
  data: MonthlyMetric[];
  selectedMonth: number | null;
  onSelectMonth: (month: number) => void;
}

export const MonthlyGenerationChart: React.FC<MonthlyGenerationChartProps> = ({
  data,
  selectedMonth,
  onSelectMonth,
}) => {
  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Monthly Solar PV Generation Breakdown</h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>
            Click any month to inspect its modeled hourly generation profile.
          </p>
        </div>
        {selectedMonth && (
          <span className="badge badge-emerald">
            Inspecting: {data.find((m) => m.month === selectedMonth)?.month_name}
          </span>
        )}
      </div>

      <div style={{ height: "300px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="month_name"
              tickFormatter={(name) => name.slice(0, 3)}
              tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
              axisLine={{ stroke: "var(--border-default)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
              axisLine={{ stroke: "var(--border-default)" }}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
              unit=" kWh"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const m = payload[0].payload as MonthlyMetric;
                  return (
                    <div
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        padding: "0.75rem",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-sm)",
                        boxShadow: "var(--shadow-md)",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                        {m.month_name} {m.year}
                      </strong>
                      <div>
                        Total Energy: <strong>{m.total_kwh.toLocaleString()} kWh</strong>
                      </div>
                      <div>
                        Capacity Factor: <strong>{m.capacity_factor_pct}%</strong>
                      </div>
                      <div>
                        Peak Output: <strong>{m.peak_kw} kW</strong>
                      </div>
                      <div>
                        Daily Average: <strong>{m.daily_average_kwh} kWh/day</strong>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="total_kwh"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={(entry) => onSelectMonth(entry.month)}
            >
              {data.map((entry) => (
                <Cell
                  key={`cell-${entry.month}`}
                  fill={entry.month === selectedMonth ? "var(--emerald-600)" : "var(--emerald-200)"}
                  stroke={entry.month === selectedMonth ? "var(--emerald-700)" : "transparent"}
                  strokeWidth={1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
