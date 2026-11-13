"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCost } from "@/lib/utils/format-cost";

interface CostChartProps {
  data: Array<{ date: string; image: number; video: number }>;
  /** Top of the value axis; the panel draws the matching gridlines. */
  max: number;
}

/** Stacked daily bars: video chart-1 below image chart-2, ember only on today's video. */
export function CostChart({ data, max }: CostChartProps) {
  const lastIndex = data.length - 1;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barCategoryGap={2} maxBarSize={14}>
        <XAxis dataKey="date" hide />
        <YAxis hide domain={[0, max]} />
        <Tooltip
          content={<SpendTooltip />}
          cursor={{ fill: "var(--pf-raised)", fillOpacity: 0.6 }}
          isAnimationActive={false}
        />
        <Bar
          dataKey="video"
          stackId="spend"
          isAnimationActive={false}
          shape={(props: unknown) => (
            <Segment
              {...(props as SegmentProps)}
              fill={(props as SegmentProps).index === lastIndex ? "var(--pf-ember)" : "var(--pf-chart-1)"}
            />
          )}
        />
        <Bar
          dataKey="image"
          stackId="spend"
          isAnimationActive={false}
          shape={(props: unknown) => <Segment {...(props as SegmentProps)} fill="var(--pf-chart-2)" />}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

type SegmentProps = { x: number; y: number; width: number; height: number; index: number; fill: string };

function Segment({ x, y, width, height, fill }: SegmentProps) {
  if (!(height > 0) || !(width > 0)) return null;
  const inset = height > 3 ? 1 : 0;
  return (
    <rect
      x={x}
      y={y + inset}
      width={width}
      height={Math.max(1, height - inset * 2)}
      rx={Math.min(3, width / 2)}
      fill={fill}
    />
  );
}

function SpendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="wb-float flex min-w-36 flex-col gap-1 px-3 py-2 text-[12px] leading-4">
      <p className="font-semibold text-fg">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center justify-between gap-4 text-fg-secondary">
          <span className="capitalize">{entry.dataKey}</span>
          <span className="font-mono text-fg">{formatCost(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}
