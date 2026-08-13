import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <div className="pf-content-viewport">
      <div className="mx-auto max-w-[1280px] px-4 py-5 pb-12 sm:px-6 lg:px-8 lg:py-6">
        <section className="grid grid-cols-2 gap-3 min-[860px]:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] px-4 py-4"
            >
              <Skeleton className="h-3 w-28 max-w-full" />
              <Skeleton className="mt-2 h-7 w-12" />
            </div>
          ))}
        </section>
        <section className="mt-3 overflow-hidden rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)]">
          <div className="flex flex-wrap justify-between gap-3 border-b border-[var(--pf-border)] p-4">
            <Skeleton className="h-9 w-80 max-w-full rounded-[8px]" />
            <Skeleton className="h-9 w-56 max-w-full rounded-[8px]" />
          </div>
          <div className="divide-y divide-[var(--pf-border)]">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-10 shrink-0 rounded-[8px]" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-48 max-w-full" />
                  <Skeleton className="mt-2 h-3 w-80 max-w-full" />
                </div>
                <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
