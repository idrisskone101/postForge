import { Skeleton } from "@/components/workbench/skeleton";

export function AutomationBuilderSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex h-14 shrink-0 items-center gap-3 pl-1 pr-2">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 xl:flex-row">
        <Skeleton shape="panel" className="min-h-[480px] flex-1" />
        <div className="flex shrink-0 flex-col gap-3 xl:w-[372px]">
          <Skeleton shape="panel" className="min-h-[320px] flex-1" />
          <Skeleton shape="panel" className="h-[300px]" />
        </div>
      </div>
    </div>
  );
}
