import { Skeleton } from "@/components/ui/skeleton";

export default function UGCInspirationLoading() {
  return (
    <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto w-full min-w-0 max-w-[1280px]">
      <div className="mb-8">
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="mt-4 h-11 w-72 max-w-full rounded-xl" />
        <Skeleton className="mt-3 h-5 w-[28rem] max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4 xl:col-span-3">
          <Skeleton className="h-[520px] rounded-[32px]" />
        </div>
        <div className="space-y-4 lg:col-span-8 xl:col-span-9">
          <Skeleton className="h-48 rounded-[32px]" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <Skeleton className="aspect-[9/16] rounded-[28px]" />
            <Skeleton className="aspect-[9/16] rounded-[28px]" />
            <Skeleton className="aspect-[9/16] rounded-[28px]" />
            <Skeleton className="aspect-[9/16] rounded-[28px]" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
