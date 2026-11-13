import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  /** The numeral. Pass a dash for an unavailable metric, never zero. */
  value: ReactNode;
  /** Sits beside the numeral: a live dot or a small chip. */
  aside?: ReactNode;
  /** Third line: plain text, or an inline `Meter` with its figures. */
  foot?: ReactNode;
};

type StatStripProps = {
  stats: readonly Stat[];
  className?: string;
};

/** Stats in one panel split by hairlines: 12/600 label over a 34/700 numeral. */
export function StatStrip({ stats, className }: StatStripProps) {
  return (
    <dl className={cn("wb-stat-strip", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="wb-stat">
          <dt className="wb-label">{stat.label}</dt>
          <dd className="wb-stat-value">
            {stat.value}
            {stat.aside}
          </dd>
          {stat.foot ? <dd className="wb-stat-foot">{stat.foot}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
