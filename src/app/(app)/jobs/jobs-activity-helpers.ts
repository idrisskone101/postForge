import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import { getModel } from "@/lib/ai/models";
import {
  getJobActivityLabel,
  getJobDestination,
  getJobStatusLabel,
} from "@/lib/jobs/presentation";
import { formatCost } from "@/lib/utils/format-cost";
import type { JobActivityItem, JobsStatusFilter, JobsTypeFilter } from "./types";

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

export type JobRowStatus =
  | { kind: "running"; label: string; progress: number }
  | { kind: "queued"; label: string }
  | { kind: "completed"; label: string }
  | { kind: "failed"; label: string };

export type JobRowView = {
  id: string;
  href: string;
  title: string;
  /** Kind, model and, on a failed job, the full failure reason. */
  sub: string;
  error: string | null;
  status: JobRowStatus;
  created: string;
  duration: string;
  cost: string;
  preview: { src: string; type: "image" | "video" } | null;
};

/** Stage position of a processing job. The queue reports stages, not percentages. */
const STAGE_PROGRESS: Record<string, number> = {
  preparing: 25,
  submitted: 50,
  downloading: 75,
};

export function toJobRow(job: JobActivityItem, now: Date): JobRowView {
  const cost = job.actualCost ?? job.estimatedCost;
  const output = job.outputs?.[0];
  const kind = getJobActivityLabel(job);
  const title = summarizeGenerationPrompt(job.prompt) || kind;
  const error = job.status === "failed" ? job.error : null;
  const model = getModel(job.model)?.name ?? job.model;
  return {
    id: job.id,
    href: getJobDestination(job),
    title,
    sub: [title === kind ? null : kind, model, error].filter(Boolean).join(" - "),
    error,
    status: jobRowStatus(job),
    created: formatJobDate(job.createdAt, now),
    duration: formatDuration(jobDurationMs(job, now)),
    cost: cost === null ? "-" : formatCost(cost),
    preview: output
      ? {
          src: `/api/files/${encodeURIComponent(output.id)}`,
          type: output.type === "video" ? "video" : "image",
        }
      : null,
  };
}

function jobRowStatus(job: JobActivityItem): JobRowStatus {
  const label = getJobStatusLabel(job);
  if (job.status === "completed") return { kind: "completed", label };
  if (job.status === "failed") return { kind: "failed", label };
  if (job.status === "queued") return { kind: "queued", label };
  return {
    kind: "running",
    label,
    progress: STAGE_PROGRESS[job.queueStage ?? ""] ?? STAGE_PROGRESS.preparing,
  };
}

function jobDurationMs(job: JobActivityItem, now: Date) {
  if (job.status === "processing" && job.startedAt) {
    return Math.max(0, now.getTime() - job.startedAt.getTime());
  }
  return job.durationMs;
}

export function formatJobDate(date: Date, now: Date) {
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  if (date.toDateString() === now.toDateString()) return `Today ${time}`;
  const day = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
  return date.getFullYear() === now.getFullYear() ? `${day} ${time}` : day;
}

export function formatDuration(durationMs: number | null) {
  if (durationMs === null) return "-";
  const totalSeconds = Math.max(1, Math.round(durationMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
