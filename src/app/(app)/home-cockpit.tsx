import Image from "next/image";
import Link from "next/link";
import { Check, ImageIcon, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import { HomeGlanceStats } from "./home-glance-stats";
import { HomeReviewQueue } from "./home-review-queue";
import { HomeEmptyPanel, HomeStartWork } from "./home-start-work";
import { ActiveJobRow } from "./home-active-lane";
import { CardHeader, CardLink } from "./home-panel";
import type { HomeDashboard, HomeMedia } from "./home-types";
import { VideoFramePreview } from "@/components/video-frame-preview";

type HomeCockpitProps = {
  dashboard: HomeDashboard;
  bare?: boolean;
};

export function HomeCockpit({ dashboard, bare = false }: HomeCockpitProps) {
  const {
    todaySummary,
    activeJobs,
    activeJobCount = activeJobs.length,
    recentJobs,
    completedThisWeek,
    pendingReviewCount,
    recentMedia,
    now = new Date(),
  } = dashboard;
  const visibleReviewJobs = recentJobs.slice(0, 4);
  const isEmpty = activeJobs.length === 0 && recentJobs.length === 0 && recentMedia.length === 0;

  const body = (
    <>
      {bare ? null : <HomeHeader now={now} />}

        <HomeGlanceStats
          todayCost={todaySummary.totalCost}
          activeJobCount={activeJobCount}
          pendingReviewCount={pendingReviewCount}
          completedThisWeek={completedThisWeek}
        />

        {isEmpty ? (
          <HomeEmptyPanel className="mt-3" />
        ) : (
          <>
            <div className="mt-3 grid items-start gap-3 min-[1024px]:grid-cols-[9fr_11fr]">
              <section className="pf-card min-w-0 p-4 sm:p-5">
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

              <section className="pf-card min-w-0 p-4 sm:p-5">
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

            <section className="pf-card mt-3 min-w-0 p-4 sm:p-5">
              <CardHeader
                title="In progress"
                action={<CardLink href="/jobs?status=active">View all jobs</CardLink>}
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

            <HomeStartWork />
          </>
        )}
    </>
  );

  if (bare) return body;

  return (
    <div className="pf-content-viewport bg-[var(--pf-canvas)]">
      <div className="mx-auto max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-8">
        {body}
      </div>
    </div>
  );
}

export function HomeHeader({ now = new Date() }: { now?: Date }) {
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  return (
    <header className="flex flex-nowrap items-end justify-between gap-3 pt-7">
      <div className="min-w-0">
        <h1 data-home-title="Home"><span className="sr-only">Home</span></h1>
        <p data-home-copy={todayLabel} className="mt-1 line-clamp-1 max-w-[8rem] text-[10px] leading-none text-[var(--pf-muted)]">
          <span className="sr-only">{todayLabel}</span>
        </p>
      </div>
      <Link href="/ugc-clone" prefetch={false} data-home-action="New Clone" className="pf-button-primary shrink-0">
        <span className="sr-only">New Clone</span>
      </Link>
    </header>
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
    <Link href={href} prefetch={false} className="group relative block min-w-0">
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
          <span className="pf-data absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
            0:{String(Math.round(media.durationSec)).padStart(2, "0")}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
