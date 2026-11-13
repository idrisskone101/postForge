import { Panel } from "@/components/workbench/panel";
import { Skeleton } from "@/components/workbench/skeleton";
import { cn } from "@/lib/utils";
import {
  PANEL_MOBILE_PAD,
  REVIEW_LIST_PAD,
  REVIEW_PANEL_CLASS,
  SIDE_PANEL_CLASS,
  WORK_ROW_CLASS,
} from "./home-cockpit";
import { GRID_CELL, STRIP_CLASS } from "./home-glance-stats";

/** Static skeleton in the final layout: real labels and titles, placeholders where numbers land. */
export default function HomeLoading() {
  return (
    <div aria-busy="true" aria-label="Loading home" className="contents">
      <div className={STRIP_CLASS}>
        {STATS.map((stat, index) => (
          <div key={stat.label} className={cn("wb-stat", GRID_CELL[index])}>
            <span className="wb-label">{stat.label}</span>
            <span className="flex h-10 items-center">
              <Skeleton shape="tile" className={cn("h-7 rounded-sm", stat.value)} />
            </span>
            <span className="flex h-4 items-center">
              <Skeleton className={stat.foot} />
            </span>
          </div>
        ))}
      </div>
      <div className={WORK_ROW_CLASS}>
        <Panel title="Review queue" className={cn(REVIEW_PANEL_CLASS, REVIEW_LIST_PAD)}>
          <div className="flex flex-col">
            {REVIEW_ROWS.map((width) => (
              <div key={width} className="flex items-center gap-3.5 border-t border-hairline py-2.5">
                <Skeleton shape="tile" className="h-16 w-12 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className={width} />
                  <Skeleton className="w-32 max-w-full" />
                </span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="In progress" className={SIDE_PANEL_CLASS}>
          {ACTIVE_ROWS.map((width) => (
            <div key={width} className="flex flex-col gap-2">
              <Skeleton className={width} />
              <Skeleton className="h-1" />
            </div>
          ))}
        </Panel>
      </div>
      <Panel title="Recent media" className={PANEL_MOBILE_PAD}>
        <div className="flex gap-3 overflow-hidden min-[1024px]:grid min-[1024px]:grid-cols-5">
          {MEDIA_TILES.map((key) => (
            <div key={key} className="wb-tile-cell w-[150px] shrink-0 min-[768px]:w-[180px] min-[1024px]:w-auto">
              <Skeleton shape="tile" className="aspect-[212/316] w-full" />
              <Skeleton className="w-3/4" />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const STATS = [
  { label: "Jobs running", value: "w-11", foot: "w-28" },
  { label: "Awaiting review", value: "w-11", foot: "w-36" },
  { label: "Completed this week", value: "w-11", foot: "h-1 w-full" },
  { label: "Spend today", value: "w-24", foot: "w-28" },
];
const REVIEW_ROWS = ["w-56 max-w-full", "w-44 max-w-full"];
const ACTIVE_ROWS = ["w-40 max-w-full", "w-52 max-w-full"];
const MEDIA_TILES = ["a", "b", "c", "d", "e"];
