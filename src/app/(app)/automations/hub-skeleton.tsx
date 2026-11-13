import { Skeleton } from "@/components/workbench";

export function HubSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading automations" className="flex min-h-0 flex-1 flex-col gap-3">
      <Skeleton shape="panel" className="h-[98px] shrink-0" />
      <Skeleton shape="panel" className="h-[212px] shrink-0" />
      <div className="flex min-h-[320px] flex-1 flex-col gap-3 min-[1380px]:flex-row">
        <Skeleton shape="panel" className="min-h-[240px] flex-1" />
        <Skeleton shape="panel" className="min-h-[240px] min-[1380px]:w-[340px]" />
      </div>
    </div>
  );
}

