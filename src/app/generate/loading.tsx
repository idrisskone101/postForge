import { Skeleton } from "@/components/ui/skeleton";

export default function GenerateLoading() {
  return (
    <div className="grid min-w-0 items-start gap-4 px-3 py-3 sm:px-5 sm:py-5 lg:px-8 xl:grid-cols-[minmax(360px,0.72fr)_minmax(500px,1.28fr)]">
      <div className="space-y-3">
        <div className="rounded-[13px] border border-[#DADBD2] bg-white p-4">
          <Skeleton className="mb-3 h-6 w-48 rounded-lg" />
          <Skeleton className="h-[118px] w-full rounded-[9px]" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-7 w-24 rounded-md" />
            ))}
          </div>
        </div>
        <div className="rounded-[13px] border border-[#DADBD2] bg-white p-4">
          <Skeleton className="mb-3 h-6 w-40 rounded-lg" />
          <Skeleton className="mb-3 h-11 w-full rounded-[11px]" />
          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-[9px]" />
            ))}
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-[13px]" />
      </div>
      <div className="overflow-hidden rounded-[14px] border border-[#DADBD2] bg-white">
        <div className="flex h-12 items-center justify-between border-b border-[#E1E2DC] px-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="grid min-h-[590px] place-items-center bg-[#EFEFE9] p-8">
          <Skeleton className="h-[500px] w-[282px] max-w-full rounded-[13px]" />
        </div>
        <div className="border-t border-[#E1E2DC] p-3">
          <Skeleton className="h-11 w-full rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}
