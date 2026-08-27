import Link from "next/link";
import { ArrowRight, ImageIcon, Play } from "lucide-react";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import {
  getJobActivityLabel,
  getJobDestination,
  isActiveGenerationJob,
} from "@/lib/jobs/presentation";
import { formatCost } from "@/lib/utils/format-cost";
import { formatDuration, formatJobDate } from "./jobs-activity-helpers";
import { JobsStatusPill } from "./jobs-status-pill";
import type { JobActivityItem } from "./types";

export function JobsTable({ jobs }: { jobs: JobActivityItem[] }) {
  return (
    <div className="min-w-0">
      <div className="hidden grid-cols-[minmax(0,1fr)_120px_150px_92px_92px_28px] gap-3 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:grid">
        <span>Activity</span>
        <span>Status</span>
        <span>Created</span>
        <span>Duration</span>
        <span className="text-right">Cost</span>
        <span className="sr-only">Open</span>
      </div>
      <div className="divide-y divide-border">
        {jobs.map((job) => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}

function JobRow({ job }: { job: JobActivityItem }) {
  const label = getJobActivityLabel(job);
  const prompt = summarizeGenerationPrompt(job.prompt) || "No prompt recorded";
  const href = getJobDestination(job);
  const cost = job.actualCost ?? job.estimatedCost;
  const active = isActiveGenerationJob(job);

  return (
    <Link
      href={href}
      prefetch={false}
      className="group grid min-w-0 gap-3 px-4 py-3 transition-colors duration-[180ms] ease-[var(--pf-ease)] hover:bg-muted md:grid-cols-[minmax(0,1fr)_120px_150px_92px_92px_28px] md:items-center"
    >
      <span className="flex min-w-0 items-start gap-3 md:items-center">
        <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-border bg-muted text-muted-foreground">
          {job.type === "video" ? (
            <Play className="size-4" />
          ) : (
            <ImageIcon className="size-4" />
          )}
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="truncate text-[13px] font-semibold text-foreground">
              {label}
            </strong>
            <code className="pf-data text-[11px] text-muted-foreground">
              {job.id.slice(0, 8)}
            </code>
          </span>
          <span className="mt-0.5 line-clamp-1 break-words text-[12px] text-muted-foreground [overflow-wrap:anywhere]">
            {prompt}
          </span>
          <span className="pf-data mt-0.5 block truncate text-[11px] text-muted-foreground md:hidden">
            {job.model} · {formatJobDate(job.createdAt)}
          </span>
          {job.status === "failed" && job.error ? (
            <span className="mt-1 line-clamp-1 block text-[11px] text-[var(--pf-danger)] [overflow-wrap:anywhere]">
              {job.error}
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex items-center justify-between gap-3 md:block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground md:hidden">
          Status
        </span>
        <JobsStatusPill job={job} />
      </span>
      <span className="pf-data hidden text-[12px] text-muted-foreground md:block">
        {formatJobDate(job.createdAt)}
      </span>
      <span className="pf-data hidden text-[12px] tabular-nums text-muted-foreground md:block">
        {active ? "Running" : formatDuration(job.durationMs)}
      </span>
      <span className="pf-data hidden text-right text-[12px] tabular-nums text-foreground md:block">
        {cost === null ? "—" : formatCost(cost)}
      </span>
      <ArrowRight className="hidden size-4 text-muted-foreground transition-transform duration-[180ms] ease-[var(--pf-ease)] group-hover:translate-x-0.5 md:block" />
    </Link>
  );
}
