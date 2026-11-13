import Link from "next/link";
import { buttonClass } from "@/components/workbench/button";
import { Panel } from "@/components/workbench/panel";
import { cn } from "@/lib/utils";
import { HomeActiveLane } from "./home-active-lane";
import { toReviewItems } from "./home-format";
import { HomeGlanceStats } from "./home-glance-stats";
import { HomeRecentMedia } from "./home-recent-media";
import { HomeReviewQueue } from "./home-review-queue";
import type { HomeDashboard } from "./home-types";

export function HomeCockpit({ dashboard }: { dashboard: HomeDashboard }) {
  const { activeJobs, recentJobs, recentMedia, now = new Date() } = dashboard;
  const reviewItems = toReviewItems(recentJobs, now).slice(0, REVIEW_ROWS);

  return (
    <>
      <HomeGlanceStats dashboard={dashboard} />
      <div className={WORK_ROW_CLASS}>
        <Panel
          title="Review queue"
          action={
            <Link href="/gallery?reviewStatus=needs_review" className={buttonClass("quiet", 32)}>
              Review all
            </Link>
          }
          className={cn(REVIEW_PANEL_CLASS, reviewItems.length > 0 && REVIEW_LIST_PAD)}
        >
          <HomeReviewQueue items={reviewItems} />
        </Panel>
        <Panel
          title="In progress"
          action={
            <Link href="/jobs?status=active" className={buttonClass("quiet", 32)}>
              View all
            </Link>
          }
          className={SIDE_PANEL_CLASS}
        >
          <HomeActiveLane jobs={activeJobs} />
        </Panel>
      </div>
      <Panel
        title="Recent media"
        action={
          <Link href="/gallery" className={buttonClass("quiet", 32)}>
            View all
          </Link>
        }
        className={PANEL_MOBILE_PAD}
      >
        <HomeRecentMedia media={recentMedia} />
      </Panel>
    </>
  );
}

/** Paper shows two rows, which keeps Recent media above the fold at 1440 x 900. */
const REVIEW_ROWS = 2;

/** Review queue and In progress share a row from 1280; below that they stack. */
export const WORK_ROW_CLASS = "flex min-w-0 flex-col gap-3 min-[1280px]:flex-row";
export const PANEL_MOBILE_PAD = "max-[767px]:px-4";
export const REVIEW_PANEL_CLASS = `min-w-0 flex-1 ${PANEL_MOBILE_PAD}`;
/** Paper: the row list sits 6px under the title and the last hairline row closes 12px above the edge. */
export const REVIEW_LIST_PAD = "gap-1.5 pb-3";
export const SIDE_PANEL_CLASS = `min-[1280px]:w-[372px] min-[1280px]:shrink-0 ${PANEL_MOBILE_PAD}`;
