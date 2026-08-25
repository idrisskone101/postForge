import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleX,
  Clock3,
  ImageIcon,
  ListChecks,
  Play,
} from "lucide-react";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import {
  getJobActivityLabel,
  getJobDestination,
  getJobStatusLabel,
  isActiveGenerationJob,
} from "@/lib/jobs/presentation";
import { formatCost } from "@/lib/utils/format-cost";
import { cn } from "@/lib/utils";

export type JobsStatusFilter = "all" | "active" | "completed" | "failed";
export type JobsTypeFilter = "all" | "image" | "video";

export type JobActivityItem = {
  id: string;
  type: string;
  model: string;
  status: string;
  queueStage: string | null;
  prompt: string;
  input: unknown;
  tags: string[];
  estimatedCost: number | null;
  actualCost: number | null;
  durationMs: number | null;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type JobsActivityViewModel = {
  jobs: JobActivityItem[];
  counts: {
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
  status: JobsStatusFilter;
  type: JobsTypeFilter;
  page: number;
  pageSize: number;
  filteredTotal: number;
};

type JobsActivityProps = {
  activity: JobsActivityViewModel;
};

export function JobsActivity({ activity }: JobsActivityProps) {
  const { jobs, counts, status, type, page, pageSize, filteredTotal } = activity;
  const firstVisible = filteredTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisible = Math.min(page * pageSize, filteredTotal);
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize));

  return (
    <div className="pf-content-viewport">
      <div className="mx-auto max-w-[1280px] px-4 py-5 pb-12 sm:px-6 lg:px-8 lg:py-6">
        <section
          data-jobs-summary="true"
          aria-label="Job activity summary"
          className="grid grid-cols-2 gap-3 min-[860px]:grid-cols-4"
          style={{ height: "10.75rem", overflow: "hidden" }}
        >
          <SummaryCard label="Running now" value={counts.active} />
          <SummaryCard label="Completed · 30 days" value={counts.completed} />
          <SummaryCard label="Failed · 30 days" value={counts.failed} />
          <SummaryCard label="Created · 30 days" value={counts.total} />
        </section>

        <section
          data-jobs-board="true"
          className="mt-3 overflow-hidden rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-[var(--pf-shadow-2xs)]"
        >
          <div
            data-jobs-filters="true"
            className="flex flex-col gap-3 border-b border-[var(--pf-border)] p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-[8px] bg-[var(--pf-active)] p-1" aria-label="Filter jobs by status">
              {STATUS_FILTERS.map((filter) => (
                <Link
                  key={filter.value}
                  href={buildJobsHref(filter.value, type)}
                  aria-current={status === filter.value ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-[var(--pf-muted)] transition-colors duration-[180ms] hover:text-[var(--pf-ink)]",
                    status === filter.value &&
                      "bg-[var(--pf-surface)] text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
                  )}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
            <div className="flex w-fit gap-1 rounded-[8px] bg-[var(--pf-active)] p-1" aria-label="Filter jobs by media type">
              {TYPE_FILTERS.map((filter) => (
                <Link
                  key={filter.value}
                  href={buildJobsHref(status, filter.value)}
                  aria-current={type === filter.value ? "page" : undefined}
                  className={cn(
                    "rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-[var(--pf-muted)] transition-colors duration-[180ms] hover:text-[var(--pf-ink)]",
                    type === filter.value &&
                      "bg-[var(--pf-surface)] text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]"
                  )}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>

          {jobs.length === 0 ? (
            <EmptyJobs status={status} />
          ) : (
            <div className="min-w-0">
              <div className="hidden grid-cols-[minmax(0,1fr)_120px_150px_92px_92px_28px] gap-3 border-b border-[var(--pf-border)] bg-[var(--pf-canvas)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:grid">
                <span>Activity</span>
                <span>Status</span>
                <span>Created</span>
                <span>Duration</span>
                <span className="text-right">Cost</span>
                <span className="sr-only">Open</span>
              </div>
              <div className="divide-y divide-[var(--pf-border)]">
                {jobs.map((job) => {
                  const label = getJobActivityLabel(job);
                  const prompt = summarizeGenerationPrompt(job.prompt) || "No prompt recorded";
                  const href = getJobDestination(job);
                  const cost = job.actualCost ?? job.estimatedCost;
                  const active = isActiveGenerationJob(job);

                  return (
                    <Link
                      key={job.id}
                      href={href}
                      className="group grid min-w-0 gap-3 px-4 py-3 transition-colors duration-[180ms] hover:bg-[var(--pf-active)] md:grid-cols-[minmax(0,1fr)_120px_150px_92px_92px_28px] md:items-center"
                    >
                      <span className="flex min-w-0 items-start gap-3 md:items-center">
                        <span className="grid size-10 shrink-0 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] text-[var(--pf-muted)]">
                          {job.type === "video" ? (
                            <Play className="size-4" />
                          ) : (
                            <ImageIcon className="size-4" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <strong className="truncate text-[13px] font-semibold text-[var(--pf-ink)]">
                              {label}
                            </strong>
                            <code className="pf-data text-[11px] text-[var(--pf-muted)]">
                              {job.id.slice(0, 8)}
                            </code>
                          </span>
                          <span className="mt-0.5 line-clamp-1 break-words text-[12px] text-[var(--pf-muted)] [overflow-wrap:anywhere]">
                            {prompt}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-[var(--pf-muted)] md:hidden">
                            {job.model} · {formatJobDate(job.createdAt)}
                          </span>
                          {job.status === "failed" && job.error ? (
                            <span className="mt-1 line-clamp-1 block text-[11px] text-[var(--pf-danger)]">
                              {job.error}
                            </span>
                          ) : null}
                        </span>
                      </span>

                      <span className="flex items-center justify-between gap-3 md:block">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)] md:hidden">
                          Status
                        </span>
                        <StatusPill job={job} />
                      </span>
                      <span className="hidden text-[12px] text-[var(--pf-muted)] md:block">
                        {formatJobDate(job.createdAt)}
                      </span>
                      <span className="hidden text-[12px] tabular-nums text-[var(--pf-muted)] md:block">
                        {active ? "Running" : formatDuration(job.durationMs)}
                      </span>
                      <span className="hidden text-right text-[12px] tabular-nums text-[var(--pf-ink)] md:block">
                        {cost === null ? "—" : formatCost(cost)}
                      </span>
                      <ArrowRight className="hidden size-4 text-[var(--pf-muted)] transition-transform duration-[180ms] group-hover:translate-x-0.5 md:block" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--pf-border)] px-4 py-3 text-[12px] text-[var(--pf-muted)]">
            <span className="tabular-nums">
              {filteredTotal === 0
                ? "No jobs"
                : `${firstVisible}–${lastVisible} of ${filteredTotal} jobs`}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={buildJobsHref(status, type, Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-2.5 font-medium text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]",
                  page <= 1 && "pointer-events-none opacity-40"
                )}
              >
                <ArrowLeft className="size-3.5" /> Previous
              </Link>
              <span className="pf-data px-1 text-[11px]">
                {page} / {pageCount}
              </span>
              <Link
                href={buildJobsHref(status, type, Math.min(pageCount, page + 1))}
                aria-disabled={page >= pageCount}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-2.5 font-medium text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]",
                  page >= pageCount && "pointer-events-none opacity-40"
                )}
              >
                Next <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}


const STATUS_FILTERS: Array<{ value: JobsStatusFilter; label: string }> = [
  { value: "all", label: "All activity" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const TYPE_FILTERS: Array<{ value: JobsTypeFilter; label: string }> = [
  { value: "all", label: "All media" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
];

function buildJobsHref(
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

function formatJobDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) return "—";
  if (durationMs < 60_000) return `${Math.max(1, Math.round(durationMs / 1_000))}s`;
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

function StatusPill({ job }: { job: JobActivityItem }) {
  const label = getJobStatusLabel(job);
  const active = isActiveGenerationJob(job);

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        active &&
          "border-[var(--pf-lamp-amber)]/30 bg-[var(--pf-lamp-amber)]/10 text-[var(--pf-lamp-amber)]",
        job.status === "completed" &&
          "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]",
        job.status === "failed" &&
          "border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
      )}
    >
      {active ? (
        <span className="pf-lamp" />
      ) : job.status === "completed" ? (
        <Check className="size-3" />
      ) : (
        <CircleX className="size-3" />
      )}
      {label}
    </span>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-4 py-4 shadow-[var(--pf-shadow-2xs)]">
      <span data-jobs-label={label}>
        <span className="sr-only">{label}</span>
      </span>
      <strong data-jobs-value={String(value)}>
        <span className="sr-only">{value}</span>
      </strong>
    </div>
  );
}

function EmptyJobs({ status }: { status: JobsStatusFilter }) {
  const active = status === "active";
  return (
    <div
      data-jobs-empty="true"
      className="flex h-[300px] flex-col items-center justify-center overflow-hidden px-5 py-10 text-center"
      style={{ height: 300, overflow: "hidden" }}
    >
      <span className="grid size-11 place-items-center rounded-full bg-[var(--pf-active)] text-[var(--pf-muted)]">
        {active ? <Clock3 className="size-5" /> : <ListChecks className="size-5" />}
      </span>
      <h2 data-empty-title={active ? "No jobs are running" : "No jobs match these filters"}>
        <span className="sr-only">{active ? "No jobs are running" : "No jobs match these filters"}</span>
      </h2>
      <p className="sr-only">
        {active
          ? "New image, video, reference, slideshow, and identity generations will appear here as soon as they start."
          : "Try another status or media type. This view keeps completed and failed activity for 30 days."}
      </p>
      <Link
        href="/generate"
        data-empty-cta="Create asset"
        className="pf-button-primary mt-4"
      >
        <span className="sr-only">Create asset</span>
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

export const EMPTY_JOBS_ACTIVITY: JobsActivityViewModel = {
  jobs: [],
  counts: { active: 0, completed: 0, failed: 0, total: 0 },
  status: "all",
  type: "all",
  page: 1,
  pageSize: 40,
  filteredTotal: 0,
};