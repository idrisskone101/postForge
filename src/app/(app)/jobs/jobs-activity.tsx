import Link from "next/link";
import { buttonClass } from "@/components/workbench/button";
import { EmptyState } from "@/components/workbench/empty-state";
import { Icon } from "@/components/workbench/icon";
import { iconButtonClass } from "@/components/workbench/icon-button";
import { Panel } from "@/components/workbench/panel";
import { JOBS_HISTORY_DAYS } from "@/lib/jobs/history-window";
import { cn } from "@/lib/utils";
import { buildJobsHref, STATUS_FILTERS, TYPE_FILTERS } from "./jobs-activity-helpers";
import { JobsStats } from "./jobs-stats";
import { JobsTable } from "./jobs-table";
import type {
  JobsActivityViewModel,
  JobsStatusFilter,
  JobsTypeFilter,
} from "./types";

export function JobsActivity({ activity }: { activity: JobsActivityViewModel }) {
  const { jobs, counts, status, type, page, pageSize, filteredTotal, now } = activity;
  const pageCount = Math.max(1, Math.ceil(filteredTotal / pageSize));

  return (
    <>
      <JobsStats counts={counts} />
      <Panel pad="none" className="min-w-0 flex-1 gap-0 px-4 pb-3 pt-4 md:px-5">
        <JobsFilters status={status} type={type} />
        {jobs.length > 0 ? (
          <JobsTable jobs={jobs} now={now} />
        ) : (
          <JobsEmpty status={status} type={type} pastEnd={filteredTotal > 0} />
        )}
        {jobs.length > 0 && pageCount > 1 ? (
          <JobsPager
            status={status}
            type={type}
            page={page}
            pageCount={pageCount}
            range={`${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filteredTotal)} / ${filteredTotal}`}
          />
        ) : null}
        {jobs.length > 0 && activity.hasOlderJobs && page >= pageCount ? (
          <p className="wb-meta pt-3">
            Showing the last {JOBS_HISTORY_DAYS} days
          </p>
        ) : null}
      </Panel>
    </>
  );
}

function JobsFilters({ status, type }: { status: JobsStatusFilter; type: JobsTypeFilter }) {
  return (
    <div className="flex flex-col items-start gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <nav aria-label="Filter jobs by status" className="wb-segmented gap-0">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={buildJobsHref(filter.value, type)}
            aria-current={status === filter.value ? "page" : undefined}
            className="wb-segment max-sm:px-3"
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Filter jobs by media type" className="wb-segmented gap-0">
        {TYPE_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={buildJobsHref(status, filter.value)}
            aria-current={type === filter.value ? "page" : undefined}
            className="wb-segment"
          >
            {filter.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

type JobsPagerProps = {
  status: JobsStatusFilter;
  type: JobsTypeFilter;
  page: number;
  pageCount: number;
  range: string;
};

function JobsPager({ status, type, page, pageCount, range }: JobsPagerProps) {
  return (
    <footer className="flex h-[52px] shrink-0 items-center justify-between border-t border-hairline pt-2 md:h-11">
      <span className="wb-mono text-fg-muted">{range}</span>
      <div className="flex gap-1.5">
        <PagerLink
          icon="chevron-left"
          label="Previous page"
          href={page > 1 ? buildJobsHref(status, type, page - 1) : null}
        />
        <PagerLink
          icon="chevron-right"
          label="Next page"
          href={page < pageCount ? buildJobsHref(status, type, page + 1) : null}
        />
      </div>
    </footer>
  );
}

function PagerLink({
  icon,
  label,
  href,
}: {
  icon: "chevron-left" | "chevron-right";
  label: string;
  href: string | null;
}) {
  const className = cn(iconButtonClass("quiet", 34), "max-md:size-11");
  if (!href) {
    return (
      <span aria-disabled="true" aria-label={label} className={cn(className, "opacity-50")}>
        <Icon name={icon} size={16} />
      </span>
    );
  }
  return (
    <Link
      href={href}
      prefetch={false} // prefetch-off: each page reruns the stat counts over the whole job table
      aria-label={label}
      title={label}
      className={className}
    >
      <Icon name={icon} size={16} />
    </Link>
  );
}

function JobsEmpty({
  status,
  type,
  pastEnd,
}: {
  status: JobsStatusFilter;
  type: JobsTypeFilter;
  pastEnd: boolean;
}) {
  if (pastEnd) {
    return (
      <EmptyState icon="jobs" title="This page is past the last job" className="min-h-[300px]">
        <Link href={buildJobsHref(status, type)} className={buttonClass("strong")}>
          Back to first page
        </Link>
      </EmptyState>
    );
  }
  if (type === "all" && (status === "all" || status === "active")) {
    return (
      <EmptyState
        icon={status === "active" ? "clock" : "jobs"}
        title={status === "active" ? "No jobs are running" : `No jobs in the last ${JOBS_HISTORY_DAYS} days`}
        className="min-h-[300px]"
      >
        <Link href="/generate" className={buttonClass("strong")}>
          Create asset
        </Link>
      </EmptyState>
    );
  }
  return (
    <EmptyState icon="jobs" title={emptyFilterTitle(status, type)} className="min-h-[300px]">
      <Link href="/jobs" className={buttonClass("strong")}>
        Show all jobs
      </Link>
    </EmptyState>
  );
}

function emptyFilterTitle(status: JobsStatusFilter, type: JobsTypeFilter) {
  const noun = TYPE_NOUN[type];
  if (status === "active") return `No ${noun} are running`;
  const adjective = status === "all" ? "" : `${status} `;
  return `No ${adjective}${noun} in the last ${JOBS_HISTORY_DAYS} days`;
}

const TYPE_NOUN: Record<JobsTypeFilter, string> = {
  all: "jobs",
  image: "images",
  video: "videos",
};
