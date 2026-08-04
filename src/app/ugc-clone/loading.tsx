import { Skeleton } from "@/components/ui/skeleton";

export default function UGCCloneLoading() {
  return (
    <div className="pf-content-viewport overflow-x-hidden bg-background">
      <div className="mx-auto min-w-0 max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
      <div className="mb-5">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="mb-4 h-14 rounded-xl" />
      <div className="grid min-h-[680px] gap-4 lg:grid-cols-[minmax(360px,36fr)_minmax(0,64fr)]">
        <Skeleton className="rounded-xl" />
        <Skeleton className="rounded-xl" />
      </div>
      </div>
    </div>
  );
}
