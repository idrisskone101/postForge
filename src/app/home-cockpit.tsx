import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  Copy,
  ImageIcon,
  Play,
  Sparkles,
} from "lucide-react";
import type { CostSummary } from "@/lib/costs/tracker";
import { formatCost } from "@/lib/utils/format-cost";
import { formatRelativeDate } from "@/lib/utils/format-date";
import { cn } from "@/lib/utils";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import { WorkspaceState } from "@/components/workspace-state";
import { VideoFramePreview } from "@/components/video-frame-preview";
import { HomeReviewQueue } from "./home-review-queue";

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

export type HomeMedia = {
  id: string;
  jobId: string;
  type: string;
  jobType: string;
  durationSec?: number | null;
  reviewStatus: string;
  model: string;
  prompt: string;
  isClone: boolean;
};

type HomeCockpitProps = {
  todaySummary: CostSummary;
  monthSummary: CostSummary;
  activeJobs: HomeJob[];
  recentJobs: HomeJob[];
  completedThisWeek: number;
  pendingReviewCount: number;
  recentMedia: HomeMedia[];
  now?: Date;
};

function isCloneJob(job: HomeJob) {
  return job.type === "video" && job.tags?.includes("ugc-clone") === true;
}

function getJobHref(job: HomeJob) {
  return isCloneJob(job) ? `/ugc-clone/${job.id}` : `/generate/${job.id}`;
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
  const prompt = summarizeGenerationPrompt(job.prompt);
  return prompt ? truncateAtWord(prompt, maxLength) : "Open this production job.";
}

function JobStatusPill({ status }: { status: string }) {
  const isProcessing = status === "processing";
  const isQueued = status === "queued";
  const isComplete = status === "completed";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize",
        isProcessing &&
          "border-[var(--pf-lamp-amber)]/30 bg-[var(--pf-lamp-amber)]/10 text-[var(--pf-lamp-amber)]",
        isQueued && "border-[var(--pf-border)] bg-[var(--pf-active)] text-[var(--pf-muted)]",
        isComplete &&
          "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]",
        !isProcessing && !isQueued && !isComplete &&
          "border-[var(--pf-border)] bg-[var(--pf-active)] text-[var(--pf-muted)]"
      )}
    >
      {isProcessing && <span className="pf-lamp" />}
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
        <span className="absolute inset-0 bg-[var(--pf-active)]">
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
      className="absolute inset-0 grid place-items-center bg-[var(--pf-active)] text-[var(--pf-muted)]"
    >
      {job.type === "video" ? <Play className="size-5" /> : <ImageIcon className="size-5" />}
    </span>
  );
}

function StatCard({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col gap-1.5 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-4 py-4 shadow-[var(--pf-shadow-2xs)] transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]"
    >
      <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)]">
        {label}
      </span>
      <span className="text-[28px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-[var(--pf-ink)]">
        {value}
      </span>
    </Link>
  );
}

function CardHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <h3 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--pf-ink)]">
        {title}
      </h3>
      {action}
    </div>
  );
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--pf-muted)] transition-colors hover:text-[var(--pf-ink)]"
    >
      {children}
      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function reviewBadge(status: string) {
  if (status === "approved_output") return { label: "Approved", dot: "bg-[#4ADE80]" };
  if (status === "rejected_output") return { label: "Rejected", dot: "bg-[#F87171]" };
  return { label: "In review", dot: "bg-[#FBBF24]" };
}

function MediaTile({ media }: { media: HomeMedia }) {
  const source = `/api/files/${encodeURIComponent(media.id)}`;
  const href = media.isClone ? `/ugc-clone/${media.jobId}` : `/generate/${media.jobId}`;
  const badge = reviewBadge(media.reviewStatus);

  return (
    <Link href={href} className="group relative block min-w-0">
      <span className="relative block aspect-square overflow-hidden rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-active)] transition-shadow duration-[180ms] group-hover:shadow-[var(--pf-shadow-md)]">
        {media.type === "video" ? (
          <VideoFramePreview
            src={source}
            label="Recent media preview"
            className="size-full object-cover"
          />
        ) : (
          <Image
            src={source}
            alt={summarizeGenerationPrompt(media.prompt) || "Recent media preview"}
            fill
            sizes="(max-width: 640px) 50vw, 220px"
            unoptimized
            className="object-cover"
          />
        )}
        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          <span className={cn("size-1.5 rounded-full", badge.dot)} />
          {badge.label}
        </span>
        {media.durationSec ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            0:{String(Math.round(media.durationSec)).padStart(2, "0")}
          </span>
        ) : null}
      </span>
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
      className="group flex min-w-0 items-center gap-3 border-t border-[var(--pf-border)] py-3 first:border-t-0"
    >
      <span
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[var(--pf-border)]",
          "bg-[var(--pf-active)] text-[var(--pf-muted)]"
        )}
      >
        {job.output ? <JobMedia job={job} /> : isVideo ? <Play className="size-3.5" /> : <ImageIcon className="size-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 break-words text-[13px] font-medium leading-[1.35] text-[var(--pf-ink)] [overflow-wrap:anywhere]">
          {getJobPreview(job, 88)}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-[var(--pf-muted)]">{meta}</span>
      </span>
      <span className="hidden min-[720px]:inline-flex">
        <JobStatusPill status={job.status} />
      </span>
      <ArrowRight className="size-4 shrink-0 text-[var(--pf-muted)] transition-transform group-hover:translate-x-0.5" />
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
      title="Start today's production loop"
      description="Pull a source from Inspiration or start a Clone when there is no active work to resume."
      action={{ href: "/ugc-inspiration", label: "Return to Inspiration" }}
      secondaryAction={{ href: "/ugc-clone", label: "Start Clone" }}
      className={cn("min-h-[340px]", className)}
    />
  );
}

export function HomeCockpit({
  todaySummary,
  monthSummary: _monthSummary,
  activeJobs,
  recentJobs,
  completedThisWeek,
  pendingReviewCount,
  recentMedia,
  now = new Date(),
}: HomeCockpitProps) {
  const visibleReviewJobs = recentJobs.slice(0, 4);
  const isEmpty = activeJobs.length === 0 && recentJobs.length === 0 && recentMedia.length === 0;
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <div className="pf-content-viewport bg-[var(--pf-canvas)]">
      <div className="mx-auto max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3 pt-7">
          <div className="min-w-0">
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--pf-ink)]">
              Home
            </h1>
            <p className="mt-1 text-[13px] text-[var(--pf-muted)]">{todayLabel}</p>
          </div>
          <Link href="/ugc-clone" className="pf-button-primary shrink-0">
            <span className="text-base leading-none">+</span> New Clone
          </Link>
        </header>

        <section
          aria-label="Today at a glance"
          className="mt-6 grid grid-cols-2 gap-3 min-[860px]:grid-cols-4"
        >
          <StatCard
            href="/costs"
            label="Spend today"
            value={formatCost(todaySummary.totalCost)}
          />
          <StatCard
            href="/generate"
            label="Jobs running"
            value={String(activeJobs.length)}
          />
          <StatCard
            href="/gallery?reviewStatus=needs_review"
            label="Awaiting review"
            value={String(pendingReviewCount)}
          />
          <StatCard
            href="/gallery"
            label="Completed this week"
            value={String(completedThisWeek)}
          />
        </section>

        {isEmpty ? (
          <EmptyPanel className="mt-3" />
        ) : (
          <>
            <div className="mt-3 grid items-start gap-3 min-[1024px]:grid-cols-[9fr_11fr]">
              <section className="min-w-0 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5">
                <CardHeader
                  title="Review queue"
                  action={
                    <CardLink href="/gallery?reviewStatus=needs_review">Review all</CardLink>
                  }
                />
                <div className="mt-3">
                  {visibleReviewJobs.length === 0 ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center px-4 py-6 text-center">
                      <span className="grid size-9 place-items-center rounded-full bg-[var(--pf-active)] text-[var(--pf-success)]">
                        <Check className="size-4" />
                      </span>
                      <p className="mt-2 text-[13px] font-medium text-[var(--pf-ink)]">
                        No outputs are waiting
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--pf-muted)]">
                        Completed work appears here first.
                      </p>
                    </div>
                  ) : (
                    <HomeReviewQueue jobs={visibleReviewJobs} />
                  )}
                </div>
              </section>

              <section className="min-w-0 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5">
                <CardHeader
                  title="Recent media"
                  action={<CardLink href="/gallery">View all</CardLink>}
                />
                {recentMedia.length === 0 ? (
                  <div className="mt-3 flex min-h-[160px] flex-col items-center justify-center px-4 py-6 text-center">
                    <span className="grid size-9 place-items-center rounded-full bg-[var(--pf-active)] text-[var(--pf-muted)]">
                      <ImageIcon className="size-4" />
                    </span>
                    <p className="mt-2 text-[13px] font-medium text-[var(--pf-ink)]">
                      Nothing generated yet
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--pf-muted)]">
                      Finished images and videos land here.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {recentMedia.map((media) => (
                      <MediaTile key={media.id} media={media} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="mt-3 min-w-0 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-[var(--pf-shadow-2xs)] sm:p-5">
              <CardHeader
                title="In progress"
                action={<CardLink href="/generate">View all</CardLink>}
              />
              {activeJobs.length === 0 ? (
                <div className="mt-3 flex min-h-[120px] flex-col items-center justify-center px-4 py-5 text-center">
                  <span className="grid size-9 place-items-center rounded-full bg-[var(--pf-active)] text-[var(--pf-muted)]">
                    <Sparkles className="size-4" />
                  </span>
                  <p className="mt-2 text-[13px] font-medium text-[var(--pf-ink)]">
                    Your queue is clear
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--pf-muted)]">
                    Start a Clone or Generate asset to fill this lane.
                  </p>
                </div>
              ) : (
                <div className="mt-1">
                  {activeJobs.map((job) => (
                    <ActiveJobRow key={job.id} job={job} />
                  ))}
                </div>
              )}
            </section>

            <section
              aria-label="Start new work"
              className="mt-3 grid gap-3 sm:grid-cols-3"
            >
              {startActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex min-w-0 items-center gap-3 rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-[var(--pf-shadow-2xs)] transition-colors duration-[180ms] hover:border-[var(--pf-border-strong)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-[8px] bg-[var(--pf-active)] text-[var(--pf-muted)] transition-colors group-hover:bg-[var(--sidebar-accent)] group-hover:text-[var(--sidebar-accent-foreground)]">
                    <action.icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--pf-ink)]">
                      {action.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[var(--pf-muted)]">
                      {action.detail}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-[var(--pf-muted)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
