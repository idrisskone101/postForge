import { Skeleton } from "@/components/ui/skeleton";

export default function UGCCloneLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="mb-8">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
          <Skeleton className="h-48 rounded-[32px]" />
          <Skeleton className="h-64 rounded-[32px]" />
        </div>
        <div className="lg:col-span-5 space-y-8">
          <Skeleton className="h-80 rounded-[32px]" />
          <Skeleton className="h-32 rounded-[32px]" />
        </div>
      </div>
    </div>
  );
}
