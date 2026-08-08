import { Skeleton } from "@/components/ui/skeleton";

export default function JobDetailLoading() {
  return (
    <div className="pf-content-viewport">
      <div className="flex min-h-[92px] flex-col gap-4 border-b border-[#DEDFD8] px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="size-9 rounded-[5px]" />
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-72 max-w-[60vw]" />
          </div>
        </div>
        <Skeleton className="h-9 w-64 rounded-[5px]" />
      </div>
      <div className="grid gap-4 p-3 sm:p-5 lg:p-6 xl:grid-cols-[minmax(0,1fr)_392px]">
        <div className="overflow-hidden rounded-[8px] border border-[#DADBD2] bg-white">
          <Skeleton className="h-12 w-full rounded-none" />
          <div className="grid min-h-[620px] place-items-center bg-[#EFEFE9] p-8">
            <Skeleton className="h-[560px] w-[315px] max-w-full rounded-[7px]" />
          </div>
          <Skeleton className="h-24 w-full rounded-none" />
        </div>
        <Skeleton className="h-[760px] w-full rounded-[8px]" />
      </div>
    </div>
  );
}
