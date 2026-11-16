import { Panel } from "@/components/workbench/panel";
import { Skeleton } from "@/components/workbench/skeleton";
import { PerformanceStats } from "./performance-stats";

export function PerformanceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading performance" className="contents">
      <PerformanceStats cells={null} />
      <div className="flex gap-3 max-lg:flex-col">
        <Panel pad="none" className="min-w-0 flex-1 gap-3 p-5">
          <Skeleton className="h-5 w-16" />
          <Skeleton shape="tile" className="h-[182px]" />
        </Panel>
        <Panel pad="none" className="w-[372px] shrink-0 gap-4 p-5 max-lg:w-full">
          <Skeleton className="h-5 w-20" />
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-[34px]" />
          ))}
        </Panel>
      </div>
      <Panel pad="none" className="min-w-0 gap-3 p-5">
        <Skeleton className="h-5 w-24" />
        <Skeleton shape="tile" className="h-9 max-md:hidden" />
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex h-14 items-center gap-3 px-3">
            <Skeleton shape="tile" className="size-9 shrink-0" />
            <Skeleton className="h-3.5 w-52 max-w-full" />
          </div>
        ))}
      </Panel>
    </div>
  );
}
