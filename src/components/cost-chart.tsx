"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCost } from "@/lib/utils/format-cost";

interface CostChartProps {
  data: Array<{ date: string; image: number; video: number }>;
}

const ACCENT_CORAL = "#FF7A59";
const ACCENT_BLUE = "#4F9FD9";

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
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="gradImage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCENT_CORAL} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCENT_CORAL} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradVideo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCENT_BLUE} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ACCENT_BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(128,128,128,0.15)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(128,128,128,0.2)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => `$${value}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="image"
          stroke={ACCENT_CORAL}
          strokeWidth={2}
          fill="url(#gradImage)"
        />
        <Area
          type="monotone"
          dataKey="video"
          stroke={ACCENT_BLUE}
          strokeWidth={2}
          fill="url(#gradVideo)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Pie chart for model split
interface ModelPieChartProps {
  data: Array<{ name: string; value: number }>;
}

export const PIE_COLORS = [ACCENT_BLUE, ACCENT_CORAL, "#7BA543", "#A78BFA", "#F59E0B", "#6366F1"];

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
