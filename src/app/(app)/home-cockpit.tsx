import Image from "next/image";
import Link from "next/link";
import { Check, ImageIcon, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { summarizeGenerationPrompt } from "@/lib/ai/prompt-presentation";
import { HomeHeader } from "./home-header";
import { HomeGlanceStats } from "./home-glance-stats";
import { HomeReviewQueue } from "./home-review-queue";
import { HomeEmptyPanel, HomeStartWork } from "./home-start-work";
import { ActiveJobRow } from "./home-active-lane";
import {
  HomeLaneEmpty,
  HomePanel,
  HomePanelBody,
  HomePanelHeader,
  HomePanelLink,
} from "./home-panel";
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
              <HomePanel>
                <HomePanelHeader
                  title="Review queue"
                  action={
                    <HomePanelLink href="/gallery?reviewStatus=needs_review">
                      Review all
                    </HomePanelLink>
                  }
                />
                <HomePanelBody>
                  {visibleReviewJobs.length === 0 ? (
                    <HomeLaneEmpty
                      icon={Check}
                      iconTone="success"
                      title="No outputs are waiting"
                      description="Completed work appears here first."
                      className="min-h-[160px]"
                    />
                  ) : (
                    <HomeReviewQueue jobs={visibleReviewJobs} />
                  )}
                </HomePanelBody>
              </HomePanel>

              <HomePanel>
                <HomePanelHeader
                  title="Recent media"
                  action={<HomePanelLink href="/gallery">View all</HomePanelLink>}
                />
                <HomePanelBody>
                  {recentMedia.length === 0 ? (
                    <HomeLaneEmpty
                      icon={ImageIcon}
                      title="Nothing generated yet"
                      description="Finished images and videos land here."
                      className="min-h-[160px]"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {recentMedia.map((media) => (
                        <MediaTile key={media.id} media={media} />
                      ))}
                    </div>
                  )}
                </HomePanelBody>
              </HomePanel>
            </div>

            <HomePanel className="mt-3">
              <HomePanelHeader
                title="In progress"
                action={<HomePanelLink href="/jobs?status=active">View all jobs</HomePanelLink>}
              />
              <HomePanelBody className="pt-1">
                {activeJobs.length === 0 ? (
                  <HomeLaneEmpty
                    icon={Sparkles}
                    title="Your queue is clear"
                    description="Start a Clone or Generate asset to fill this lane."
                    className="min-h-[120px] py-5"
                  />
                ) : (
                  <div>
                    {activeJobs.map((job) => (
                      <ActiveJobRow key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </HomePanelBody>
            </HomePanel>

            <HomeStartWork />
          </>
        )}
    </>
  );

  if (bare) return body;

  return (
    <div className="pf-content-viewport bg-background">
      <div className="mx-auto max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-8">
        {body}
      </div>
    </div>
  );
}

export { HomeHeader } from "./home-header";

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
      <span className="relative block aspect-square overflow-hidden rounded-[8px] border border-border bg-muted transition-shadow duration-[180ms] group-hover:shadow-[var(--pf-shadow-md)]">
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
