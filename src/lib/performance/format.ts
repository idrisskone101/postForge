import type { MetricAggregate } from "@/lib/performance/metrics";

const formatCompact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMetric(value: number | null) {
  return value === null ? "—" : formatCompact.format(value);
}

export function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? "Date unavailable"
    : parsed.toLocaleDateString();
}

export function formatSyncDate(value: string | null) {
  if (!value) return "Never synced";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return "Sync time unavailable";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function metricAvailability(aggregate: MetricAggregate, noun: string) {
  if (aggregate.total === 0) return "No posts in range";
  if (aggregate.available === aggregate.total) return `${aggregate.total} ${noun} in range`;
  return `${aggregate.available} of ${aggregate.total} ${noun} report this metric`;
}
