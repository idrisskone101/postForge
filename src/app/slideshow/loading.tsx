import { Skeleton } from "@/components/ui/skeleton";

export default function SlideshowLoading() {
  return (
    <div className="min-h-[calc(100vh-96px)] bg-background">
      <div className="border-b border-border px-5 py-3 sm:px-6 lg:px-8">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-[1280px] gap-5 px-5 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <Skeleton className="h-[360px] rounded-3xl" />
        <Skeleton className="h-[360px] rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
