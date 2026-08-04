import { Skeleton } from "@/components/ui/skeleton";

function RowSkeleton() {
  return (
    <div className="border-t border-border py-2.5 first:border-t-0">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-[42px] w-9 rounded-md" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-full max-w-[240px]" />
          <Skeleton className="mt-1.5 h-3 w-32 max-w-full" />
        </div>
      </div>
    </div>
  );
}

export default function HomeLoading() {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-3.5 px-4 pb-6 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="pf-eyebrow">Home</p>
          <h2 className="mt-1 text-[27px] font-semibold leading-none tracking-[-0.045em] text-[#232323] sm:text-[30px]">
            Daily production cockpit
          </h2>
          <Skeleton className="mt-2.5 h-3.5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 shrink-0 rounded-[10px]" />
      </div>

      <section
        aria-label="Today at a glance"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-[13px] border border-border bg-border shadow-[var(--pf-shadow-xs)] min-[860px]:grid-cols-4"
      >
        {["In progress", "Awaiting review", "Started today", "Spend today"].map((label) => (
          <div key={label} className="flex min-w-0 flex-col gap-1 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {label}
            </p>
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-24 max-w-full" />
          </div>
        ))}
      </section>

      <div className="grid items-start gap-3.5 min-[1080px]:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <section className="min-w-0 rounded-[13px] border border-border bg-card p-3.5 shadow-[var(--pf-shadow-xs)] sm:p-4">
            <h3 className="text-sm font-semibold tracking-tight">In progress</h3>
            <div className="mt-1">
              {Array.from({ length: 3 }).map((_, index) => (
                <RowSkeleton key={index} />
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-[13px] border border-border bg-card p-3.5 shadow-[var(--pf-shadow-xs)] sm:p-4">
            <h3 className="text-sm font-semibold tracking-tight">Needs review</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/5] rounded-[10px]" />
              ))}
            </div>
          </section>
        </div>

        <aside className="min-w-0 rounded-[13px] border border-border bg-card p-3.5 shadow-[var(--pf-shadow-xs)] sm:p-4">
          <h3 className="text-sm font-semibold tracking-tight">Start new work</h3>
          <div className="mt-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
