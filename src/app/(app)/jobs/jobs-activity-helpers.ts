import type { JobsStatusFilter, JobsTypeFilter } from "./types";

export const STATUS_FILTERS: Array<{ value: JobsStatusFilter; label: string }> = [
  { value: "all", label: "All activity" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export const TYPE_FILTERS: Array<{ value: JobsTypeFilter; label: string }> = [
  { value: "all", label: "All media" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

export const SUMMARY_CARDS = [
  { label: "Running now", countKey: "active" as const, href: "/jobs?status=active" },
  {
    label: "Completed · 30 days",
    countKey: "completed" as const,
    href: "/jobs?status=completed",
  },
  { label: "Failed · 30 days", countKey: "failed" as const, href: "/jobs?status=failed" },
  { label: "Created · 30 days", countKey: "total" as const, href: "/jobs" },
] as const;

export function buildJobsHref(
  status: JobsStatusFilter,
  type: JobsTypeFilter,
  page = 1
) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (type !== "all") params.set("type", type);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}

export function formatJobDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDuration(durationMs: number | null) {
  if (durationMs === null) return "—";
  if (durationMs < 60_000) return `${Math.max(1, Math.round(durationMs / 1_000))}s`;
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}
