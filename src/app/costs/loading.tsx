import { Skeleton } from "@/components/ui/skeleton";

export default function CostsLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-24 bg-zinc-800" />
        <Skeleton className="h-4 w-56 bg-zinc-800/60" />
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-64 rounded-lg bg-zinc-800" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-zinc-800" />
              <Skeleton className="size-4 rounded bg-zinc-800" />
            </div>
            <Skeleton className="h-8 w-20 bg-zinc-800" />
            <Skeleton className="h-3 w-32 bg-zinc-800/60" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <Skeleton className="h-4 w-48 bg-zinc-800" />
        <Skeleton className="h-[350px] w-full rounded-lg bg-zinc-800/40" />
      </div>

      {/* Table skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4"
          >
            <Skeleton className="h-4 w-28 bg-zinc-800" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-6 w-full bg-zinc-800/40" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
