import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  Copy,
  GalleryHorizontalEnd,
  ImageIcon,
  Play,
  Sparkles,
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
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold capitalize",
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
        <h3 className="truncate text-sm font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function StatCell({
  href,
  label,
  value,
  sub,
  dotClassName,
  mixBar,
  mixLabel,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
  dotClassName?: string;
  mixBar?: { imagePercent: number; videoPercent: number };
  mixLabel?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col gap-1 bg-white px-4 py-3 transition-colors hover:bg-[#F7F7F2]"
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        {dotClassName ? <span className={cn("size-1.5 shrink-0 rounded-full", dotClassName)} /> : null}
        {label}
      </span>
      <span className="font-mono text-xl font-semibold leading-tight tracking-tight tabular-nums text-[#232323]">
        {value}
      </span>
      {mixBar ? (
        <span className="mt-1 flex h-1 overflow-hidden rounded-full bg-muted" aria-label={mixLabel}>
          {mixBar.imagePercent > 0 && (
            <span className="h-full bg-accent-blue" style={{ width: `${mixBar.imagePercent}%` }} />
          )}
          {mixBar.videoPercent > 0 && (
            <span className="h-full bg-[#ff4a20]" style={{ width: `${mixBar.videoPercent}%` }} />
          )}
        </span>
      ) : null}
      <span className="truncate text-[10px] text-muted-foreground">{sub}</span>
    </Link>
  );
}

function ActiveJobRow({ job }: { job: HomeJob }) {
  const isVideo = job.type === "video";
  const contextDetail =
    job.productionContext?.identityDetail ?? job.productionContext?.sourceDetail ?? null;
  const meta = [job.model, contextDetail, formatRelativeDate(job.createdAt)]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={getJobHref(job)}
      className="group grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-border py-2.5 first:border-t-0"
    >
      <span
        className={cn(
          "relative flex h-[42px] w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border",
          isVideo ? "bg-stone-900 text-white" : "bg-orange-50 text-[#ff4a20]"
        )}
      >
        {job.output ? <JobMedia job={job} /> : isVideo ? <Play className="size-3.5" /> : <ImageIcon className="size-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 break-words text-[11px] font-semibold leading-[1.35] [overflow-wrap:anywhere]">
          {getJobPreview(job, 88)}
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{meta}</span>
      </span>
      <span className="hidden min-[720px]:inline-flex">
        <JobStatusPill status={job.status} />
      </span>
      <ArrowRight className="size-3.5 shrink-0 justify-self-end text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function ReviewCard({ job }: { job: HomeJob }) {
  return (
    <Link href={getJobHref(job)} className="group min-w-0">
      <span className="relative block aspect-[4/5] overflow-hidden rounded-[10px] border border-border bg-[#E8E9E2] shadow-[var(--pf-shadow-2xs)] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:shadow-[var(--pf-shadow-md)]">
        <JobMedia job={job} />
        <span className="absolute bottom-1.5 left-1.5 grid size-6 place-items-center rounded-full bg-white/95 text-stone-900 shadow-sm">
          {job.type === "video" ? <Play className="size-3" fill="currentColor" /> : <ImageIcon className="size-3" />}
        </span>
        {job.output?.durationSec ? (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium text-white">
            0:{String(Math.round(job.output.durationSec)).padStart(2, "0")}
          </span>
        ) : null}
      </span>
      <span className="mt-1.5 block truncate text-[10px] font-semibold">{getJobTitle(job)}</span>
      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
        {job.model} · {formatRelativeDate(job.createdAt)}
      </span>
    </Link>
  );
}

const startActions = [
  {
    href: "/ugc-inspiration",
    icon: Compass,
    title: "Browse inspiration",
    detail: "Pull a source clip from TikTok",
  },
  {
    href: "/ugc-clone",
    icon: Copy,
    title: "Start a clone",
    detail: "Recreate a hook with a linked identity",
  },
  {
    href: "/generate",
    icon: Sparkles,
    title: "Generate an asset",
    detail: "Image or video straight from a prompt",
  },
];

function EmptyPanel({ className }: { className?: string }) {
  return (
    <WorkspaceState
      tone="empty"
      icon={Compass}
      title="Start today's Daily Production Loop"
      description="Pull a source from Inspiration or start a Clone when there is no active work to resume."
      action={{ href: "/ugc-inspiration", label: "Return to Inspiration" }}
      secondaryAction={{ href: "/ugc-clone", label: "Start Clone" }}
      className={cn("min-h-[340px]", className)}
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
  const visibleActiveJobs = activeJobs.slice(0, 3);
  const visibleRecentJobs = recentJobs.slice(0, 3);
  const jobsStartedToday = Array.from(
    new Map(
      [...activeJobs, ...recentJobs]
        .filter((job) => isSameLocalDay(job.createdAt, now))
        .map((job) => [job.id, job])
    ).values()
  );
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
  const isEmpty = activeJobs.length === 0 && recentJobs.length === 0;
  const workspaceState = isEmpty
    ? "Empty"
    : activeJobs.length > 0 && recentJobs.length > 0
      ? "Populated"
      : "Partial";
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
              className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-[#DADBD2] bg-[#ECEDE7] px-3 text-[11px] font-semibold text-[#666762]"
              aria-label={`Workspace state: ${workspaceState}`}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  activeJobs.length > 0 ? "bg-accent-blue" : "bg-[#A6A7A1]"
                )}
              />
              <span className="whitespace-nowrap">{activeJobs.length} in progress</span>
              <span className="text-[#B9BAB4]">·</span>
              <span className="whitespace-nowrap">{recentJobs.length} to review</span>
            </div>
            <Link href="/ugc-clone" className="pf-button-primary shrink-0">
              <span className="text-base leading-none">+</span> New clone
            </Link>
          </div>
        </header>

        <section
          aria-label="Today at a glance"
          className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[13px] border border-border bg-border shadow-[var(--pf-shadow-xs)] min-[860px]:grid-cols-4"
        >
          <StatCell
            href="/generate"
            label="In progress"
            value={String(activeJobs.length)}
            sub={activeJobs.length > 0 ? "jobs moving right now" : "queue is clear"}
            dotClassName={activeJobs.length > 0 ? "bg-accent-blue" : undefined}
          />
          <StatCell
            href="/gallery?reviewStatus=needs_review"
            label="Awaiting review"
            value={String(recentJobs.length)}
            sub={recentJobs.length > 0 ? "outputs waiting on a decision" : "nothing to decide"}
            dotClassName={recentJobs.length > 0 ? "bg-amber-500" : undefined}
          />
          <StatCell
            href="/generate"
            label="Started today"
            value={String(jobsStartedToday.length)}
            sub={jobsStartedToday.length > 0 ? "jobs started since midnight" : "no jobs started yet"}
          />
          <StatCell
            href="/costs"
            label="Spend today"
            value={formatCost(todaySummary.totalCost)}
            sub={
              todaySpendTotal > 0
                ? `Image ${formatCost(todaySummary.breakdown.image.cost)} · Video ${formatCost(todaySummary.breakdown.video.cost)} · ${formatCost(monthSummary.totalCost)} this month`
                : "No tracked generation spend today"
            }
            mixBar={
              todaySpendTotal > 0
                ? { imagePercent: todayImageSpendPercent, videoPercent: todayVideoSpendPercent }
                : undefined
            }
            mixLabel="Today's spend mix by generation type"
          />
        </section>

        {isEmpty ? (
          <EmptyPanel className="mt-3.5" />
        ) : (
          <div className="mt-3.5 grid items-start gap-3.5 min-[1080px]:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-3.5">
              <section className="min-w-0 rounded-[13px] border border-border bg-card p-3.5 shadow-[var(--pf-shadow-xs)] sm:p-4">
                <PanelHeading
                  title="In progress"
                  description={
                    activeJobs.length > 0
                      ? `${activeJobs.length} job${activeJobs.length === 1 ? "" : "s"} moving through the queue`
                      : "Nothing generating right now"
                  }
                  action={<PanelLink href="/generate">View all</PanelLink>}
                />
                {visibleActiveJobs.length === 0 ? (
                  <div className="flex min-h-[132px] flex-col items-center justify-center px-4 py-5 text-center">
                    <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <Sparkles className="size-4" />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold">Your queue is clear</p>
                    <p className="mt-1 max-w-xs text-[10px] text-muted-foreground">
                      Start a Clone or Generate asset to fill this lane.
                    </p>
                    <Link
                      href="/ugc-clone"
                      className="mt-2 text-[10px] font-semibold text-[#ff4a20] hover:underline"
                    >
                      Start a Clone
                    </Link>
                  </div>
                ) : (
                  <div>{visibleActiveJobs.map((job) => <ActiveJobRow key={job.id} job={job} />)}</div>
                )}
              </section>

              <section className="min-w-0 rounded-[13px] border border-border bg-card p-3.5 shadow-[var(--pf-shadow-xs)] sm:p-4">
                <PanelHeading
                  title="Needs review"
                  description={
                    recentJobs.length > 0
                      ? `${recentJobs.length} visible output${recentJobs.length === 1 ? "" : "s"} awaiting a decision`
                      : "Completed work appears here first"
                  }
                  action={<PanelLink href="/gallery?reviewStatus=needs_review">Review all</PanelLink>}
                />
                {visibleRecentJobs.length === 0 ? (
                  <div className="flex min-h-[132px] flex-col items-center justify-center px-4 py-5 text-center">
                    <GalleryHorizontalEnd className="size-5 text-muted-foreground" />
                    <p className="mt-2 text-[11px] font-semibold">No outputs are waiting</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Completed work appears here first.
                    </p>
                  </div>
                ) : (
                  <div
                    data-home-pending-review-grid="true"
                    className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
                  >
                    {visibleRecentJobs.map((job) => (
                      <ReviewCard key={`${job.id}:${job.output?.id ?? "job"}`} job={job} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="min-w-0 rounded-[13px] border border-border bg-card p-3.5 shadow-[var(--pf-shadow-xs)] sm:p-4">
              <PanelHeading
                title="Start new work"
                description="Three ways into today's loop"
              />
              <div>
                {startActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-border py-3 first:border-t-0"
                  >
                    <span className="grid size-10 place-items-center rounded-[11px] bg-[#F0F1EB] text-[#4C4D48] transition-colors group-hover:bg-[#FFE9E1] group-hover:text-[#ff4a20]">
                      <action.icon className="size-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold">{action.title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                        {action.detail}
                      </span>
                    </span>
                    <ArrowRight className="size-3.5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
