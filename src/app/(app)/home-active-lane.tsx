import Link from "next/link";
import { EmptyState } from "@/components/workbench/empty-state";
import { SplitMeter } from "@/components/workbench/split-meter";
import { getJobDestination, getJobStatusLabel } from "@/lib/jobs/presentation";
import { cn } from "@/lib/utils";
import { homeJobTitle, STAGE_COUNT, stageStep } from "./home-format";
import type { HomeJob } from "./home-types";

export function HomeActiveLane({ jobs }: { jobs: HomeJob[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon="jobs"
        title="Nothing in progress"
        className="min-h-[132px] rounded-none border-0 p-0"
      />
    );
  }
  return (
    <ul className="-mx-2 -my-1 flex flex-col gap-2">
      {jobs.map((job) => (
        <li key={job.id}>
          <ActiveJobRow job={job} />
        </li>
      ))}
    </ul>
  );
}

export function ActiveJobRow({ job }: { job: HomeJob }) {
  const running = job.status === "processing";
  const statusLabel = getJobStatusLabel(job);
  const step = stageStep(job.queueStage);

  return (
    <Link
      href={getJobDestination(job)}
      // prefetch-off: one link per running job; each would prefetch its detail route on load.
      prefetch={false}
      className="flex min-w-0 flex-col gap-2 rounded-lg px-2 py-1 transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised/60"
    >
      <span className="flex min-w-0 items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[14px] font-semibold leading-[18px] text-fg [overflow-wrap:anywhere]">
          {homeJobTitle(job)}
        </span>
        <span
          className={cn(
            "shrink-0 text-[13px] leading-4",
            running ? "font-semibold text-ember-text" : "font-medium text-fg-muted"
          )}
        >
          {statusLabel}
        </span>
      </span>
      {running ? (
        <SplitMeter
          equal
          label={`${statusLabel}, stage ${step} of ${STAGE_COUNT}`}
          parts={Array.from({ length: STAGE_COUNT }, (_, index) => ({
            value: 1,
            tone: index < step ? ("ember" as const) : ("empty" as const),
          }))}
          className="flex-none"
        />
      ) : null}
    </Link>
  );
}
