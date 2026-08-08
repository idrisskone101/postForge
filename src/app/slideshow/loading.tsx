import { Skeleton } from "@/components/ui/skeleton";

export default function SlideshowLoading() {
  return (
    <div className="min-h-[calc(100vh-96px)]">
      <div className="px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-hidden rounded-[5px] bg-[#F0F1EB] p-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-24 shrink-0 rounded-[7px]" />
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-[1240px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.32fr)_minmax(300px,0.68fr)] lg:px-8">
        <Skeleton className="h-[260px] rounded-[7px]" />
        <div className="grid gap-4">
          <Skeleton className="h-[122px] rounded-[7px]" />
          <Skeleton className="h-[122px] rounded-[7px]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-[7px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
