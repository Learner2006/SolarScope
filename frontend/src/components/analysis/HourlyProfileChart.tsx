import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { HourlyPoint } from "../../types/analysis";

interface HourlyProfileChartProps {
  monthName: string;
  points: HourlyPoint[];
}

export const HourlyProfileChart: React.FC<HourlyProfileChartProps> = ({
  monthName,
  points,
}) => {
  // Compute diurnal 24-hour average curve from the actual hourly simulation data for this month
  const diurnalData = Array.from({ length: 24 }, (_, h) => {
    const matchingHours = points.filter((p) => p.hour === h);
    const avgKw =
      matchingHours.length > 0
        ? matchingHours.reduce((acc, p) => acc + p.generation_kw, 0) / matchingHours.length
        : 0;
    const maxKw = Math.max(...matchingHours.map((p) => p.generation_kw), 0);

    return {
      hour: `${h.toString().padStart(2, "0")}:00`,
      hourNum: h,
      avg_kw: parseFloat(avgKw.toFixed(3)),
      max_kw: parseFloat(maxKw.toFixed(3)),
      intervalsCount: matchingHours.length,
    };
  });

  return (
    <div className="card" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600 }}>
            Modeled Diurnal Solar Profile — {monthName}
          </h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-tertiary)" }}>
            Aggregated across all {points.length} modeled hourly intervals in {monthName}.
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: 10, height: 10, backgroundColor: "var(--emerald-600)", borderRadius: 2 }} />
            Average Output (kW)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ width: 10, height: 10, backgroundColor: "var(--emerald-200)", borderRadius: 2 }} />
            Peak Solar Hour (kW)
          </span>
        </div>
      </div>

      <div style={{ height: "240px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={diurnalData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--emerald-500)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--emerald-500)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
              axisLine={{ stroke: "var(--border-default)" }}
              tickLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
              axisLine={{ stroke: "var(--border-default)" }}
              tickLine={false}
              unit=" kW"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        padding: "0.5rem 0.75rem",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-sm)",
                        boxShadow: "var(--shadow-sm)",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: "0.2rem" }}>
                        Time: {d.hour}
                      </strong>
                      <div>Average: <strong>{d.avg_kw} kW</strong></div>
                      <div>Peak observed: <strong>{d.max_kw} kW</strong></div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="max_kw"
              stroke="var(--emerald-300)"
              fillOpacity={0}
              strokeDasharray="3 3"
            />
            <Area
              type="monotone"
              dataKey="avg_kw"
              stroke="var(--emerald-600)"
              strokeWidth={2}
              fill="url(#emeraldGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
