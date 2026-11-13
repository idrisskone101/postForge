import { Skeleton } from "@/components/workbench";

export function CloneFormSkeleton() {
  return (
    <div
      data-clone-form-skeleton="true"
      aria-hidden="true"
      className="flex min-w-0 gap-3 max-xl:flex-col"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Skeleton shape="panel" className="h-[420px]" />
        <Skeleton shape="panel" className="h-[138px]" />
      </div>
      <div className="flex w-[380px] shrink-0 flex-col gap-3 max-xl:w-full">
        <Skeleton shape="panel" className="h-[422px]" />
        <Skeleton shape="panel" className="h-[262px]" />
      </div>
    </div>
  );
}

export function CloneQueueSkeleton() {
  return (
    <Skeleton
      shape="panel"
      className="h-[273px]"
    />
  );
}
