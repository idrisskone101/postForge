import { Skeleton } from "@/components/ui/skeleton";

function RowSkeleton() {
  return (
    <div className="border-t border-border py-3 first:border-t-0">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

export default function HomeLoading() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                Home
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Daily Production Loop
              </h2>
              <Skeleton className="mt-3 h-4 w-full max-w-xl" />
            </div>
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>

          <div className="mt-6 border-y border-border py-4">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">
              Next up
            </p>
            <Skeleton className="mt-3 h-5 w-full max-w-xl" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Review new Outputs",
              "Inspect active jobs",
              "Return to Inspiration",
            ].map((label) => (
              <div
                key={label}
                className="h-9 rounded-lg border border-border bg-background/40 px-3"
              >
                <span className="text-xs font-semibold leading-9 text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Compact Spend
          </p>
          <Skeleton className="mt-3 h-8 w-24" />
          <div className="mt-5 grid grid-cols-3 gap-3">
            {["Today", "Outputs", "Active"].map((label) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  {label}
                </p>
                <Skeleton className="mt-2 h-4 w-12" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-5 h-12 rounded-md" />
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-base font-semibold">Active jobs</h3>
          <Skeleton className="mt-2 h-3 w-64" />
          <div className="mt-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-base font-semibold">Pending review</h3>
          <Skeleton className="mt-2 h-3 w-72" />
          <div className="mt-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <RowSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
