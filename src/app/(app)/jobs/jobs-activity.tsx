import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock3, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildJobsHref,
  STATUS_FILTERS,
  SUMMARY_CARDS,
  TYPE_FILTERS,
} from "./jobs-activity-helpers";
import { JobsPanel } from "./jobs-panel";
import { JobsTable } from "./jobs-table";
import type { JobsActivityViewModel, JobsStatusFilter } from "./types";

type JobsActivityProps = {
  activity: JobsActivityViewModel;
};

export function JobsActivity({ activity }: JobsActivityProps) {
  const { jobs, counts, status, type, page, pageSize, filteredTotal } = activity;
  const firstVisible = filteredTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisible = Math.min(page * pageSize, filteredTotal);
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize));

  return (
    <div className="pf-content-viewport bg-background">
      <div
        data-jobs-page="true"
        className="mx-auto max-w-[1280px] pb-12 sm:px-6 lg:px-8 lg:py-6"
        style={{ paddingTop: 20, paddingLeft: 16, paddingRight: 16 }}
      >
        <section
          data-jobs-summary="true"
          aria-label="Job activity summary"
          className="grid grid-cols-2 gap-3"
          style={{ height: "10.75rem", overflow: "hidden" }}
        >
          {SUMMARY_CARDS.map((card) => (
            <SummaryCard
              key={card.label}
              href={card.href}
              label={card.label}
              value={counts[card.countKey]}
            />
          ))}
        </section>

        <JobsPanel
          data-jobs-filters="true"
          className="mt-3 flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div
            className="flex max-w-full gap-1 overflow-x-auto rounded-[8px] bg-muted p-1"
            aria-label="Filter jobs by status"
          >
            {STATUS_FILTERS.map((filter) => (
              <Link
                key={filter.value}
                href={buildJobsHref(filter.value, type)}
                aria-current={status === filter.value ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors duration-[180ms] ease-[var(--pf-ease)] hover:text-foreground",
                  status === filter.value &&
                    "bg-card text-foreground shadow-[var(--pf-shadow-2xs)]"
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>
          <div
            className="flex w-fit gap-1 rounded-[8px] bg-muted p-1"
            aria-label="Filter jobs by media type"
          >
            {TYPE_FILTERS.map((filter) => (
              <Link
                key={filter.value}
                href={buildJobsHref(status, filter.value)}
                aria-current={type === filter.value ? "page" : undefined}
                className={cn(
                  "rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors duration-[180ms] ease-[var(--pf-ease)] hover:text-foreground",
                  type === filter.value &&
                    "bg-card text-foreground shadow-[var(--pf-shadow-2xs)]"
                )}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </JobsPanel>

        <JobsPanel data-jobs-board="true" className="mt-3 overflow-hidden">
          {jobs.length === 0 ? (
            <EmptyJobs status={status} />
          ) : (
            <JobsTable jobs={jobs} />
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[12px] text-muted-foreground">
            <span className="tabular-nums">
              {filteredTotal === 0
                ? "No jobs"
                : `${firstVisible}–${lastVisible} of ${filteredTotal} jobs`}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={buildJobsHref(status, type, Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                prefetch={false}
                className={cn(
                  "pf-button-secondary inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px]",
                  page <= 1 && "pointer-events-none opacity-40"
                )}
              >
                <ArrowLeft className="size-3.5" /> Previous
              </Link>
              <span className="pf-data px-1 text-[11px]">
                {page} / {pageCount}
              </span>
              <Link
                href={buildJobsHref(status, type, Math.min(pageCount, page + 1))}
                aria-disabled={page >= pageCount}
                prefetch={false}
                className={cn(
                  "pf-button-secondary inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px]",
                  page >= pageCount && "pointer-events-none opacity-40"
                )}
              >
                Next <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </footer>
        </JobsPanel>
      </div>
    </div>
  );
}

function SummaryCard({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-card px-4 py-4 transition-[border-color] duration-[180ms] ease-[var(--pf-ease)] hover:border-[var(--pf-border-strong)]"
    >
      <span data-jobs-label={label}>
        <span className="sr-only">{label}</span>
      </span>
      <strong data-jobs-value={String(value)}>
        <span className="sr-only">{value}</span>
      </strong>
    </Link>
  );
}

function EmptyJobs({ status }: { status: JobsStatusFilter }) {
  const active = status === "active";
  return (
    <div
      data-jobs-empty="true"
      className="flex h-[300px] flex-col items-center justify-center overflow-hidden px-5 py-10 text-center"
      style={{ height: 300, overflow: "hidden" }}
    >
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        {active ? <Clock3 className="size-5" /> : <ListChecks className="size-5" />}
      </span>
      <h2 data-empty-title={active ? "No jobs are running" : "No jobs match these filters"}>
        <span className="sr-only">
          {active ? "No jobs are running" : "No jobs match these filters"}
        </span>
      </h2>
      <p className="sr-only">
        {active
          ? "New image, video, reference, slideshow, and identity generations will appear here as soon as they start."
          : "Try another status or media type. This view keeps completed and failed activity for 30 days."}
      </p>
      <Link
        href="/generate"
        data-empty-cta="Create asset"
        className="pf-button-primary mt-4"
      >
        <span className="sr-only">Create asset</span>
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
