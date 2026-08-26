"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PIE_COLORS, SERIES_INK, SERIES_MUTED } from "@/lib/costs/chart-colors";
import { formatCost } from "@/lib/utils/format-cost";

interface CostChartProps {
  data: Array<{ date: string; image: number; video: number }>;
}

export function CostChart({ data }: CostChartProps) {
  return (
    <div role="img" aria-label="Image and video spend over time">
      <ResponsiveContainer width="100%" height={276}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--pf-border)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--pf-muted)", fontSize: 10 }}
            axisLine={{ stroke: "var(--pf-border)" }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: "var(--pf-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `$${value}`}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "color-mix(in srgb, var(--pf-ink) 4%, transparent)" }}
          />
          <Bar
            dataKey="image"
            stackId="spend"
            fill={SERIES_MUTED}
            maxBarSize={24}
          />
          <Bar
            dataKey="video"
            stackId="spend"
            fill={SERIES_INK}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-3 py-2 shadow-[var(--pf-shadow-2xs)]">
      <p className="mb-1 text-xs font-medium text-[var(--pf-ink)]">{label}</p>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center justify-between gap-4 text-xs"
        >
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize text-[var(--pf-muted)]">{entry.dataKey}</span>
          </span>
          <span className="font-medium text-[var(--pf-ink)]">
            {formatCost(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface ModelPieChartProps {
  data: Array<{ name: string; value: number }>;
}

export function ModelPieChart({ data }: ModelPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={65}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCost(value)}
          contentStyle={{
            background: "var(--pf-surface)",
            border: "1px solid var(--pf-border)",
            borderRadius: "8px",
            color: "var(--pf-ink)",
            fontSize: "12px",
          }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
