import { Panel } from "@/components/workbench/panel";
import { Skeleton } from "@/components/workbench/skeleton";
import { JobsStats } from "./jobs-stats";

export function JobsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading jobs" className="contents">
      <JobsStats counts={null} />
      <Panel pad="none" className="min-w-0 gap-0 px-4 pb-3 pt-4 md:px-5">
        <div className="flex flex-col items-start gap-2 pb-3 sm:flex-row sm:justify-between">
          <Skeleton shape="tile" className="h-9 w-[318px] max-w-full rounded-full" />
          <Skeleton shape="tile" className="h-9 w-[226px] rounded-full" />
        </div>
        <Skeleton shape="tile" className="h-9 max-lg:hidden" />
        {ROW_WIDTHS.map(([title, sub]) => (
          <div key={title} className="wb-row">
            <Skeleton shape="tile" className="size-10 shrink-0" />
            <span className="flex flex-col gap-2">
              <Skeleton style={{ width: title }} />
              <Skeleton style={{ width: sub }} />
            </span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

const ROW_WIDTHS = [
  [220, 140],
  [180, 120],
  [200, 150],
  [240, 130],
  [170, 110],
  [210, 140],
] as const;
