import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock3,
  Compass,
  GalleryHorizontalEnd,
  ImageIcon,
  Play,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { CostSummary } from "@/lib/costs/tracker";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import { WorkspaceState } from "@/components/workspace-state";
import { VideoFramePreview } from "@/components/video-frame-preview";

export type HomeJob = {
  id: string;
  prompt: string;
  type: string;
  model: string;
  status: string;
  tags?: string[];
  createdAt: Date;
  productionContext?: {
    sourceDetail: string | null;
    identityDetail: string | null;
  };
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
  now?: Date;
};

function isCloneJob(job: HomeJob) {
  return job.type === "video" && job.tags?.includes("ugc-clone") === true;
}

function getJobHref(job: HomeJob) {
  return isCloneJob(job) ? `/ugc-clone/${job.id}` : `/generate/${job.id}`;
}

function cleanPrompt(prompt: string) {
  return prompt.replace(/^@\S+\s+/, "").replace(/\s+/g, " ").trim();
}

function truncateAtWord(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const trimmed = value.slice(0, maxLength).trimEnd();
  const lastSpace = trimmed.lastIndexOf(" ");
  const text = lastSpace > maxLength * 0.65 ? trimmed.slice(0, lastSpace) : trimmed;
  return `${text}…`;
}

function getJobTitle(job: HomeJob) {
  const isActive = job.status === "queued" || job.status === "processing";
  const clone = isCloneJob(job);
  if (isActive) return clone ? "Clone in progress" : "Generation in progress";
  if (job.status === "completed") {
    return clone ? "Clone output ready" : "Generated asset ready";
  }
  return clone ? "Clone job" : "Generation job";
}

function getJobPreview(job: HomeJob, maxLength = 96) {
  const prompt = cleanPrompt(job.prompt);
  return prompt ? truncateAtWord(prompt, maxLength) : "Open this production job.";
}

export function getHomeProductionSteps(job: HomeJob) {
  const sourceDetail = job.productionContext?.sourceDetail ?? null;
  const identityDetail = job.productionContext?.identityDetail ?? null;

  return [
    {
      label: "Source",
      detail: sourceDetail ?? "Not linked",
      complete: sourceDetail !== null,
    },
    {
      label: "Identity",
      detail: identityDetail ?? "Not linked",
      complete: identityDetail !== null,
    },
    {
      label: "Generate",
      detail: job.status === "completed" ? "Ready" : job.status,
      complete: job.status === "completed",
    },
  ];
}

function isSameLocalDay(date: Date, reference: Date) {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function JobStatusPill({ status }: { status: string }) {
  const isProcessing = status === "processing";
  const isQueued = status === "queued";
  const isComplete = status === "completed";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold capitalize",
        isProcessing && "border-blue-200 bg-blue-50 text-blue-700",
        isQueued && "border-amber-200 bg-amber-50 text-amber-700",
        isComplete && "border-emerald-200 bg-emerald-50 text-emerald-700",
        !isProcessing && !isQueued && !isComplete &&
          "border-border bg-muted text-muted-foreground"
      )}
    >
      {(isProcessing || isQueued) && <span className="size-1.5 rounded-full bg-current" />}
      {isComplete && <Check className="size-3" />}
      <span className="truncate">{status}</span>
    </span>
  );
}

function JobMedia({ job, priority = false }: { job: HomeJob; priority?: boolean }) {
  if (job.output) {
    const source = `/api/files/${encodeURIComponent(job.output.id)}`;
    if (job.type === "video") {
      return (
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,74,32,.45),transparent_31%),linear-gradient(145deg,#34332e,#171714)]">
        <VideoFramePreview
          src={source}
          label={`${getJobTitle(job)} preview`}
          className="size-full object-cover"
        />
        </span>
      );
    }
    return (
      <Image
        src={source}
        alt={`${getJobTitle(job)} preview`}
        fill
        sizes="(max-width: 640px) 50vw, 280px"
        priority={priority}
        unoptimized
        className="object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_28%_18%,rgba(255,74,32,.62),transparent_31%),linear-gradient(145deg,#34332e,#171714)] text-white"
    >
      {job.type === "video" ? <Play className="size-7" /> : <ImageIcon className="size-7" />}
    </span>
  );
}

function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 border-b border-border pb-3">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">{title}</h3>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ActiveJobRow({ job }: { job: HomeJob }) {
  const isVideo = job.type === "video";
  return (
    <Link
      href={getJobHref(job)}
      className="group grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-border py-2.5 first:border-t-0"
    >
      <span
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border",
          isVideo ? "bg-stone-900 text-white" : "bg-orange-50 text-[#ff4a20]"
        )}
      >
        {job.output ? <JobMedia job={job} /> : isVideo ? <Play className="size-3.5" /> : <ImageIcon className="size-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold">{getJobPreview(job, 54)}</span>
        <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">
          {job.model} · {formatRelativeDate(job.createdAt)}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <JobStatusPill status={job.status} />
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function ReviewCard({ job }: { job: HomeJob }) {
  return (
    <Link href={getJobHref(job)} className="group min-w-0">
      <span className="relative block aspect-[4/5] overflow-hidden rounded-lg border border-border bg-[#E8E9E2]">
        <JobMedia job={job} />
        <span className="absolute bottom-1.5 left-1.5 grid size-6 place-items-center rounded-full bg-white/95 text-stone-900 shadow-sm">
          {job.type === "video" ? <Play className="size-3" fill="currentColor" /> : <ImageIcon className="size-3" />}
        </span>
        {job.output?.durationSec ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[8px] font-medium text-white">
            0:{String(Math.round(job.output.durationSec)).padStart(2, "0")}
          </span>
        ) : null}
      </span>
      <span className="mt-1.5 block truncate text-[10px] font-semibold">{getJobTitle(job)}</span>
      <span className="mt-0.5 block truncate text-[8px] text-muted-foreground">
        {job.model} · {job.id.slice(0, 6)}
      </span>
    </Link>
  );
}

function EmptyPanel({ className }: { className?: string }) {
  return (
    <WorkspaceState
      tone="empty"
      icon={Compass}
      title="Start today's Daily Production Loop"
      description="Pull a source from Inspiration or start a Clone when there is no active work to resume."
      action={{ href: "/ugc-inspiration", label: "Return to Inspiration" }}
      secondaryAction={{ href: "/ugc-clone", label: "Start Clone" }}
      className={cn("min-h-[238px]", className)}
    />
  );
}

export function HomeCockpit({
  todaySummary,
  monthSummary,
  activeJobs,
  recentJobs,
  now = new Date(),
}: HomeCockpitProps) {
  const nextJob = activeJobs[0] ?? recentJobs[0] ?? null;
  const visibleActiveJobs = activeJobs.slice(0, 3);
  const visibleRecentJobs = recentJobs.slice(0, 3);
  const todayCount = todaySummary.breakdown.image.count + todaySummary.breakdown.video.count;
  const monthCount = monthSummary.breakdown.image.count + monthSummary.breakdown.video.count;
  const jobsStartedToday = Array.from(
    new Map(
      [...activeJobs, ...recentJobs]
        .filter((job) => isSameLocalDay(job.createdAt, now))
        .map((job) => [job.id, job])
    ).values()
  );
  const linkedSourcesToday = jobsStartedToday.filter(
    (job) => job.productionContext?.sourceDetail
  ).length;
  const todaySpendTotal =
    todaySummary.breakdown.image.cost + todaySummary.breakdown.video.cost;
  const todayImageSpendPercent =
    todaySpendTotal > 0
      ? (todaySummary.breakdown.image.cost / todaySpendTotal) * 100
      : 0;
  const todayVideoSpendPercent =
    todaySpendTotal > 0
      ? (todaySummary.breakdown.video.cost / todaySpendTotal) * 100
      : 0;
  const workspaceState =
    activeJobs.length > 0 && recentJobs.length > 0
      ? "Populated"
      : activeJobs.length > 0 || recentJobs.length > 0
        ? "Partial"
        : "Empty";
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(now)
    .toUpperCase();

  return (
    <div className="pf-content-viewport bg-[#F3F4EF]">
      <div className="mx-auto max-w-[1280px] px-4 pb-6 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-7">
        <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="pf-eyebrow">{todayLabel}</p>
            <h1 className="mt-1 text-[27px] font-semibold leading-none tracking-[-0.045em] text-[#232323] sm:text-[30px]">
              Daily production cockpit
            </h1>
            <p className="mt-1.5 text-[11px] leading-5 text-[#777873]">
              Keep today&apos;s UGC loop moving from source to approved output.
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
            <div
              data-home-production-status="true"
              className="inline-flex h-9 min-w-0 items-center gap-1 rounded-lg border border-[#DADBD2] bg-[#ECEDE7] p-1 text-[8px]"
              aria-label={`Workspace state: ${workspaceState}`}
            >
              <span className="px-1.5 font-semibold uppercase tracking-[0.1em] text-[#858681]">Live</span>
              <span className="truncate rounded-md bg-white px-2.5 py-1.5 font-semibold text-[#232323] shadow-sm">{workspaceState}</span>
            </div>
            <Link href="/ugc-clone" className="pf-button-primary shrink-0">
              <span className="text-base leading-none">+</span> New clone
            </Link>
          </div>
        </header>

        <div className="mt-5 flex flex-col gap-3.5">
          {nextJob ? (
            <section className="grid min-h-[238px] overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(32,32,28,.04)] lg:grid-cols-[minmax(0,1fr)_250px]">
              <div className="flex min-w-0 flex-col p-4 sm:p-5">
                <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Next production task
                </p>
                <h2 className="mt-3 min-w-0 max-w-3xl break-words text-xl font-semibold leading-[1.08] tracking-[-0.035em] [overflow-wrap:anywhere] sm:text-[22px]">
                  {getJobPreview(nextJob, 88)}
                </h2>
                <p className="mt-2 max-w-2xl text-[11px] leading-[1.15rem] text-muted-foreground">
                  {nextJob.status === "completed"
                    ? nextJob.productionContext?.sourceDetail ||
                        nextJob.productionContext?.identityDetail
                      ? "The output is ready for review with its saved production context."
                      : "The output is ready for review. Open it to inspect the generated result."
                    : nextJob.productionContext?.sourceDetail ||
                        nextJob.productionContext?.identityDetail
                      ? "The saved job includes linked production context. Continue from its current queue state."
                      : "The generation request is saved. Open its workspace to inspect the current queue state."}
                </p>
                <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[9px] text-muted-foreground">
                    <Clock3 className="size-3" /> {formatRelativeDate(nextJob.createdAt)}
                  </span>
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[9px] text-muted-foreground">
                    <WandSparkles className="size-3" /> <span className="truncate">{nextJob.model}</span>
                  </span>
                  <JobStatusPill status={nextJob.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={getJobHref(nextJob)} className="pf-button-primary">
                    {nextJob.status === "completed" ? "Review output" : "Continue"} in {isCloneJob(nextJob) ? "Clone" : "Generate"}
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Link href="/ugc-inspiration" className="pf-button-secondary">
                    Do this later
                  </Link>
                </div>
                <div className="mt-auto grid min-w-0 grid-cols-3 gap-2 border-t border-border pt-3">
                  {getHomeProductionSteps(nextJob).map((step, index) => (
                    <span key={step.label} className="flex min-w-0 items-center gap-2">
                      <i className={cn("grid size-5 shrink-0 place-items-center rounded-full border text-[8px] not-italic", step.complete ? "border-stone-700 bg-stone-800 text-white" : "border-border bg-background text-muted-foreground")}>
                        {step.complete ? <Check className="size-3" /> : index + 1}
                      </i>
                      <span className="min-w-0">
                        <b className="block truncate text-[8px]">{step.label}</b>
                        <small className="block truncate text-[7px] text-muted-foreground">{step.detail}</small>
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <Link href={getJobHref(nextJob)} aria-label={`Open ${getJobTitle(nextJob)}`} className="group relative min-h-56 overflow-hidden border-t border-border bg-[#24231f] lg:min-h-0 lg:border-l lg:border-t-0">
                <JobMedia job={nextJob} priority />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
                <span className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white">
                  <span className="min-w-0">
                    <small className="block truncate text-[8px] text-white/65">{isCloneJob(nextJob) ? "Clone workspace" : "Generation workspace"}</small>
                    <b className="mt-0.5 block truncate text-[10px]">Open production workspace</b>
                  </span>
                  <i className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-stone-900 not-italic transition-transform group-hover:scale-105">
                    <ArrowRight className="size-4" />
                  </i>
                </span>
              </Link>
            </section>
          ) : (
            <EmptyPanel />
          )}

          <section className="grid gap-3 min-[1080px]:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
            <div className="min-w-0 rounded-xl border border-border bg-card p-3.5 sm:p-4">
              <PanelHeading
                title="Active jobs"
                description={visibleActiveJobs.length > 0 ? `${activeJobs.length} job${activeJobs.length === 1 ? " is" : "s are"} moving` : "Nothing generating right now"}
                action={<Link href="/generate" className="inline-flex shrink-0 items-center gap-1 text-[9px] font-semibold text-muted-foreground hover:text-foreground">View all <ArrowRight className="size-3" /></Link>}
              />
              {visibleActiveJobs.length === 0 ? (
                <div className="flex min-h-[132px] flex-col items-center justify-center px-4 py-5 text-center">
                  <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"><Sparkles className="size-4" /></span>
                  <p className="mt-2 text-[11px] font-semibold">Your queue is clear</p>
                  <p className="mt-1 max-w-xs text-[9px] text-muted-foreground">Start a Clone or Generate asset to fill this lane.</p>
                  <Link href="/ugc-clone" className="mt-2 text-[9px] font-semibold text-[#ff4a20] hover:underline">Start a Clone</Link>
                </div>
              ) : (
                <div>{visibleActiveJobs.map((job) => <ActiveJobRow key={job.id} job={job} />)}</div>
              )}
            </div>

            <div className="min-w-0 rounded-xl border border-border bg-card p-3.5 sm:p-4">
              <PanelHeading
                title="Needs review"
                description={`${recentJobs.length} visible output${recentJobs.length === 1 ? "" : "s"} awaiting a decision`}
                action={<Link href="/gallery" className="inline-flex shrink-0 items-center gap-1 text-[9px] font-semibold text-muted-foreground hover:text-foreground">Review all <ArrowRight className="size-3" /></Link>}
              />
              {visibleRecentJobs.length === 0 ? (
                <div className="flex min-h-[132px] flex-col items-center justify-center px-4 py-5 text-center">
                  <GalleryHorizontalEnd className="size-5 text-muted-foreground" />
                  <p className="mt-2 text-[11px] font-semibold">No outputs are waiting</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">Completed work appears here first.</p>
                </div>
              ) : (
                <div data-home-pending-review-grid="true" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {visibleRecentJobs.map((job) => (
                    <ReviewCard key={`${job.id}:${job.output?.id ?? "job"}`} job={job} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-3 min-[920px]:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-border bg-card p-3.5 sm:p-4">
              <span className="sr-only">Compact Spend</span>
              <PanelHeading
                title="Spend today"
                description={`Across ${todayCount} tracked generation${todayCount === 1 ? "" : "s"}`}
                action={<CircleDollarSign className="size-3.5 text-muted-foreground" />}
              />
              <div className="mt-3 flex min-w-0 flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[25px] font-semibold leading-none tracking-[-0.04em]">{formatCost(todaySummary.totalCost)}</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">{formatCost(monthSummary.totalCost)} this month · {monthCount} tracked generations</p>
                </div>
                <Link href="/costs" className="text-[9px] font-semibold text-foreground hover:underline">Open Spend</Link>
              </div>
              {todaySpendTotal > 0 ? (
                <div className="mt-3" aria-label="Today's spend mix by generation type">
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                    {todayImageSpendPercent > 0 && (
                      <span
                        className="h-full bg-accent-blue"
                        style={{ width: `${todayImageSpendPercent}%` }}
                      />
                    )}
                    {todayVideoSpendPercent > 0 && (
                      <span
                        className="h-full bg-[#ff4a20]"
                        style={{ width: `${todayVideoSpendPercent}%` }}
                      />
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-[8px] text-muted-foreground">
                    <span className="min-w-0 truncate">
                      Image · {formatCost(todaySummary.breakdown.image.cost)}
                    </span>
                    <span className="min-w-0 truncate text-right">
                      Video · {formatCost(todaySummary.breakdown.video.cost)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-[9px] text-muted-foreground">
                  No tracked generation spend today.
                </p>
              )}
            </div>

            <div className="min-w-0 rounded-xl border border-border bg-card p-3.5 sm:p-4">
              <PanelHeading
                title="Today's loop"
                description={`${jobsStartedToday.length} visible job${jobsStartedToday.length === 1 ? "" : "s"} started today`}
                action={<span className="rounded-full bg-muted px-2 py-1 text-[8px] font-semibold text-muted-foreground">Live data</span>}
              />
              <div className="mt-1">
                {[
                  {
                    label: "Linked source context",
                    detail:
                      linkedSourcesToday > 0
                        ? `${linkedSourcesToday} visible job${linkedSourcesToday === 1 ? " includes" : "s include"} linked source context`
                        : "None observed on today's jobs",
                    value: linkedSourcesToday,
                    attention: false,
                    href: "/ugc-inspiration",
                  },
                  {
                    label: "Tracked generations",
                    detail: `${todayCount} cost entr${todayCount === 1 ? "y" : "ies"} today`,
                    value: todayCount,
                    attention: false,
                    href: "/generate",
                  },
                  {
                    label: "Current review queue",
                    detail:
                      recentJobs.length > 0
                        ? `${recentJobs.length} visible output${recentJobs.length === 1 ? "" : "s"} awaiting a decision`
                        : "Queue is clear",
                    value: recentJobs.length,
                    attention: recentJobs.length > 0,
                    href: "/gallery?reviewStatus=needs_review",
                  },
                ].map((step, index) => (
                  <Link key={step.label} href={step.href} className="group grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 border-t border-border py-2 first:border-t-0">
                    <span className={cn("grid size-6 place-items-center rounded-full border text-[8px] font-semibold", step.attention ? "border-amber-300 bg-amber-50 text-amber-800" : step.value > 0 ? "border-stone-700 bg-stone-800 text-white" : "border-border bg-background text-muted-foreground")}>
                      {step.value > 99 ? "99+" : step.value > 0 ? step.value : index + 1}
                    </span>
                    <span className="min-w-0"><b className="block truncate text-[10px]">{step.label}</b><small className="block truncate text-[8px] text-muted-foreground">{step.detail}</small></span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
