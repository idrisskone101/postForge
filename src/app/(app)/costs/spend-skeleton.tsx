import { Panel } from "@/components/workbench/panel";
import { Skeleton } from "@/components/workbench/skeleton";
import { StatStrip } from "@/components/workbench/stat-strip";

export function SpendSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading spend" className="contents">
      <StatStrip
        className="shrink-0 max-md:flex-col max-md:gap-4 max-md:[&>.wb-stat]:border-l-0 max-md:[&>.wb-stat]:px-0 [&>.wb-stat:nth-child(3)]:flex-[1.6]"
        stats={["Spend", "Generations", "Budget left"].map((label) => ({
          label,
          value: <Skeleton shape="tile" className="my-1 h-8 w-24 rounded-sm" />,
        }))}
      />
      <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:flex">
        <Panel pad="none" className="min-w-0 gap-3 p-5 lg:col-span-2 xl:flex-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton shape="tile" className="h-[192px]" />
        </Panel>
        <Panel pad="none" className="min-w-0 gap-3.5 p-5 xl:w-[252px] xl:shrink-0">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3.5" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </Panel>
        <Panel pad="none" className="min-w-0 gap-4 p-5 xl:w-[320px] xl:shrink-0">
          <Skeleton className="h-5 w-20" />
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-6" />
          ))}
        </Panel>
      </div>
      <Panel pad="none" className="min-w-0 gap-3 p-5">
        <Skeleton className="h-5 w-32" />
        <Skeleton shape="tile" className="h-9 max-lg:hidden" />
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex h-[54px] items-center gap-3 px-3">
            <Skeleton className="h-3.5 w-56 max-w-full" />
          </div>
        ))}
      </Panel>
    </div>
  );
}
