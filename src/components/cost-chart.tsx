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
import { formatCost } from "@/lib/utils/format-cost";

interface CostChartProps {
  data: Array<{ date: string; image: number; video: number }>;
}

const ACCENT_CORAL = "#FF4A20";
const ACCENT_BLUE = "#378EFF";

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
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-lg text-popover-foreground">
      <p className="text-xs font-medium mb-1">{label}</p>
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
            <span className="capitalize text-muted-foreground">{entry.dataKey}</span>
          </span>
          <span className="font-medium">
            {formatCost(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CostChart({ data }: CostChartProps) {
  return (
    <div role="img" aria-label="Image and video spend over time">
      <ResponsiveContainer width="100%" height={276}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(128,128,128,0.15)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(128,128,128,0.2)" }}
            tickLine={false}
            minTickGap={20}
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(35,35,35,0.035)" }} />
          <Bar
            dataKey="image"
            stackId="spend"
            fill={ACCENT_BLUE}
            maxBarSize={24}
          />
          <Bar
            dataKey="video"
            stackId="spend"
            fill={ACCENT_CORAL}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Pie chart for model split
interface ModelPieChartProps {
  data: Array<{ name: string; value: number }>;
}

export const PIE_COLORS = [
  ACCENT_CORAL,
  "#7777E8",
  "#7CB99A",
  "#E6B759",
  ACCENT_BLUE,
  "#A78BFA",
];

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
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--popover-foreground)",
            fontSize: "12px",
          }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
