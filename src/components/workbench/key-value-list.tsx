import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KeyValueRow = {
  label: string;
  /** Pass a dash for an unavailable value. */
  value: ReactNode;
  /** Geist Mono for ids, costs, timestamps and durations. */
  mono?: boolean;
};

type KeyValueListProps = {
  rows: readonly KeyValueRow[];
  className?: string;
};

/** Inspector rows split by hairlines: muted label left, value right. */
export function KeyValueList({ rows, className }: KeyValueListProps) {
  return (
    <dl className={cn("wb-kv", className)}>
      {rows.map((row) => (
        <div key={row.label} className="wb-kv-row">
          <dt>{row.label}</dt>
          <dd data-mono={row.mono ? "true" : undefined}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
