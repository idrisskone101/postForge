import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-7 sm:px-6 lg:px-8">
      <header className="flex flex-nowrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Skeleton className="h-[33px] w-28" />
          <Skeleton className="mt-2.5 h-3.5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 shrink-0 rounded-[8px]" />
      </header>

      <section
        aria-label="Today at a glance"
        className="mt-6 grid grid-cols-2 gap-3 min-[860px]:!grid-cols-4"
      >
        {["Spend today", "Jobs running", "Awaiting review", "Completed this week"].map((label) => (
          <div key={label} className="pf-card flex min-w-0 flex-col gap-1.5 px-4 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--pf-muted)]">
              {label}
            </span>
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </section>

      <div className="mt-3 grid items-start gap-3 min-[1024px]:grid-cols-[9fr_11fr]">
        <section aria-label="Review queue" className="pf-card min-w-0 p-4 sm:p-5">
          <Skeleton className="h-4 w-28" />
          <div className="mt-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </section>

        <section aria-label="Recent media" className="pf-card min-w-0 p-4 sm:p-5">
          <Skeleton className="h-4 w-28" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-[8px]" />
            ))}
          </div>
        </section>
      </div>

      <section aria-label="In progress" className="pf-card mt-3 min-w-0 p-4 sm:p-5">
        <Skeleton className="h-4 w-24" />
        <div className="mt-1">
          {Array.from({ length: 2 }).map((_, index) => (
            <RowSkeleton key={index} />
          ))}
        </div>
      </section>

      <section
        aria-label="Start new work"
        className="mt-3 grid gap-3 sm:grid-cols-3"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="pf-card flex min-w-0 items-center gap-3 p-4">
            <Skeleton className="size-10 shrink-0 rounded-[8px]" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3.5 w-full max-w-[140px]" />
              <Skeleton className="mt-1.5 h-3 w-24 max-w-full" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="border-t border-[var(--pf-border)] py-3 first:border-t-0">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-[8px]" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-full max-w-[240px]" />
          <Skeleton className="mt-1.5 h-3 w-32 max-w-full" />
        </div>
      </div>
    </div>
  );
}
