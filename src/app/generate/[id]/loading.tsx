import { Skeleton } from "@/components/ui/skeleton";

export default function JobDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="ml-auto h-6 w-24 rounded-full" />
      </div>

      {/* Media area */}
      <Skeleton className="mb-8 aspect-square w-full rounded-xl sm:aspect-video" />

      {/* Action buttons */}
      <div className="mb-8 flex gap-3">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <Skeleton className="mb-4 h-5 w-20" />
        <div className="space-y-4">
          <div>
            <Skeleton className="mb-1 h-3 w-16" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="mt-1 h-5 w-3/4" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="mb-1 h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
            <div>
              <Skeleton className="mb-1 h-3 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
