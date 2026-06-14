import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Compass,
  DollarSign,
  GalleryHorizontalEnd,
  Loader2,
  Users,
} from "lucide-react";
import type { CostSummary } from "@/lib/costs/tracker";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import { WorkspaceState } from "@/components/workspace-state";

export type HomeJob = {
  id: string;
  prompt: string;
  type: string;
  model: string;
  status: string;
  createdAt: Date;
  output?: {
    id: string;
    width?: number | null;
    height?: number | null;
    durationSec?: number | null;
  } | null;
};

type HomeCockpitProps = {
  todaySummary: CostSummary;
  monthSummary: CostSummary;
  activeJobs: HomeJob[];
  recentJobs: HomeJob[];
};

function getJobHref(job: HomeJob) {
  return job.type === "video" ? `/ugc-clone/${job.id}` : `/generate/${job.id}`;
}

function cleanPrompt(prompt: string) {
  return prompt.replace(/^@\S+\s+/, "").replace(/\s+/g, " ").trim();
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  const trimmed = value.slice(0, maxLength).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  const text = lastSpace > maxLength * 0.65 ? trimmed.slice(0, lastSpace) : trimmed;

  return `${text}...`;
}

function getJobTitle(job: HomeJob) {
  const isActive = job.status === "queued" || job.status === "processing";
  if (isActive) return job.type === "video" ? "Clone in progress" : "Generation in progress";
  if (job.status === "completed") return job.type === "video" ? "Clone output ready" : "Generated asset ready";
  return job.type === "video" ? "Clone job" : "Generation job";
}

function getJobPreview(job: HomeJob, maxLength = 96) {
  const prompt = cleanPrompt(job.prompt);
  return prompt ? truncateAtWord(prompt, maxLength) : "Open this production job.";
}

function JobStatusPill({ status }: { status: string }) {
  const isActive = status === "queued" || status === "processing";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase",
        isActive
          ? "bg-accent-blue/10 text-accent-blue"
          : "bg-accent-green/10 text-accent-green"
      )}
    >
      {isActive && <span className="size-1.5 rounded-full bg-current" />}
      {status}
    </span>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Users;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background/40 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent-coral/40 hover:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function JobRow({ job }: { job: HomeJob }) {
  return (
    <Link
      href={getJobHref(job)}
      className="group flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0"
    >
      <div className="min-w-0">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <JobStatusPill status={job.status} />
          <span className="font-mono text-[10px] text-muted-foreground">
            {job.id.slice(0, 8)}
          </span>
        </div>
        <p className="text-sm font-medium">{getJobTitle(job)}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {getJobPreview(job, 82)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {job.model} · {formatRelativeDate(job.createdAt)}
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent-coral" />
    </Link>
  );
}

function EmptyPanel() {
  return (
    <WorkspaceState
      tone="empty"
      icon={Compass}
      title="Start today's Daily Production Loop"
      description="Pull a source from Inspiration or start a Clone when there is no active work to resume."
      action={{ href: "/ugc-inspiration", label: "Return to Inspiration" }}
      secondaryAction={{ href: "/ugc-clone", label: "Start Clone" }}
      className="min-h-48"
    />
  );
}

export function HomeCockpit({
  todaySummary,
  monthSummary,
  activeJobs,
  recentJobs,
}: HomeCockpitProps) {
  const latestClone = recentJobs[0] ?? activeJobs[0] ?? null;
  const latestOutput = recentJobs[0] ?? null;
  const activeJob = activeJobs[0] ?? null;
  const visibleActiveJobs = activeJobs.slice(0, 3);
  const visibleRecentJobs = recentJobs;
  const todayCount =
    todaySummary.breakdown.image.count + todaySummary.breakdown.video.count;
  const monthCount =
    monthSummary.breakdown.image.count + monthSummary.breakdown.video.count;

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Home
              </p>
              <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
                Resume the Daily Production Loop
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Pick up the next production task without opening a full
                dashboard.
              </p>
            </div>
            <Link
              href={latestClone ? getJobHref(latestClone) : "/ugc-clone"}
              className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-accent-coral px-4 text-sm font-semibold whitespace-nowrap text-white hover:bg-[#ff6540]"
            >
              <Users className="size-4" />
              Continue latest Clone
            </Link>
          </div>

          {latestClone ? (
            <Link
              href={getJobHref(latestClone)}
              className="group mt-6 flex items-center justify-between gap-4 border-y border-border py-4"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Next up
                </p>
                <p className="mt-1 text-base font-semibold">
                  {getJobTitle(latestClone)}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {getJobPreview(latestClone, 118)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {latestClone.model} · {formatRelativeDate(latestClone.createdAt)}
                </p>
              </div>
              <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent-coral" />
            </Link>
          ) : (
            <EmptyPanel />
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <QuickLink
              href={latestOutput ? getJobHref(latestOutput) : "/gallery"}
              icon={GalleryHorizontalEnd}
              label="Review new Outputs"
            />
            <QuickLink
              href={activeJob ? getJobHref(activeJob) : "/generate"}
              icon={Loader2}
              label="Inspect active jobs"
            />
            <QuickLink
              href="/ugc-inspiration"
              icon={Compass}
              label="Return to Inspiration"
            />
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Compact Spend
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCost(monthSummary.totalCost)}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-accent-coral/10 text-accent-coral">
              <DollarSign className="size-5" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Today
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatCost(todaySummary.totalCost)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Outputs
              </p>
              <p className="mt-1 text-sm font-semibold">{monthCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Active
              </p>
              <p className="mt-1 text-sm font-semibold">{activeJobs.length}</p>
            </div>
          </div>

          <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            {todayCount > 0
              ? `${todayCount} output${todayCount === 1 ? "" : "s"} moved through today.`
              : "No spend yet today. Start from Inspiration when ready."}
          </p>

          <Link
            href="/costs"
            className="mt-3 inline-flex h-8 items-center gap-2 text-xs font-semibold text-accent-coral hover:text-[#ff6540]"
          >
            Open Spend
            <ArrowRight className="size-3.5" />
          </Link>
        </aside>
      </section>

      {activeJobs.length === 0 && recentJobs.length === 0 ? (
        <EmptyPanel />
      ) : (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Active jobs</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Queued and processing work that may need inspection.
                </p>
              </div>
              <Clock3 className="size-4 text-muted-foreground" />
            </div>

            {visibleActiveJobs.length === 0 ? (
              <p className="border-t border-border py-4 text-sm text-muted-foreground">
                No active jobs. Start a Clone or Generate asset to fill this
                lane.
              </p>
            ) : (
              visibleActiveJobs.map((job) => <JobRow key={job.id} job={job} />)
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Pending review</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Recent Outputs ready for Gallery review and handoff.
                </p>
              </div>
              <Link
                href="/gallery"
                className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-accent-coral/40 hover:text-foreground"
              >
                <GalleryHorizontalEnd className="size-3.5" />
                Open Gallery
              </Link>
            </div>

            {visibleRecentJobs.length === 0 ? (
              <p className="border-t border-border py-4 text-sm text-muted-foreground">
                No Outputs are waiting yet. Completed Clone and Generate work
                will appear here first.
              </p>
            ) : (
              <div
                data-home-pending-review-scroll="true"
                className="max-h-[360px] overflow-y-auto overscroll-contain pr-2"
              >
                {visibleRecentJobs.map((job) => <JobRow key={job.id} job={job} />)}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
