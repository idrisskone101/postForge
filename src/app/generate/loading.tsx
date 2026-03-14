import { Skeleton } from "@/components/ui/skeleton";

export default function GenerateLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>
      <div className="flex flex-col gap-6">
        {/* Model picker skeleton */}
        <div>
          <Skeleton className="mb-2 h-4 w-16" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
        {/* Prompt skeleton */}
        <div>
          <Skeleton className="mb-2 h-4 w-16" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
        {/* Aspect ratio skeleton */}
        <div>
          <Skeleton className="mb-2 h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
        {/* Submit button skeleton */}
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
  );
}
