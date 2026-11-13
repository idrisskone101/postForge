import { Skeleton } from "@/components/workbench";

export function CollectionsSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-3" aria-busy="true" aria-label="Loading collections">
      <section className="wb-panel max-sm:px-4" data-pad="wide">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} shape="tile" className="h-[196px]" />
          ))}
        </div>
      </section>
      <section className="wb-panel max-sm:px-4" data-pad="wide">
        <Skeleton className="h-9 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[87.5rem]:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} shape="tile" className="aspect-[142/181]" />
          ))}
        </div>
      </section>
    </div>
  );
}
