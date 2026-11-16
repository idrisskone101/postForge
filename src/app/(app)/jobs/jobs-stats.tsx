import { Skeleton } from "@/components/workbench/skeleton";
import { StatStrip } from "@/components/workbench/stat-strip";
import { JOBS_HISTORY_DAYS } from "@/lib/jobs/history-window";
import { cn } from "@/lib/utils";
import type { JobsCounts } from "./types";

/** `counts: null` renders the loading strip with the same labels and frame. */
export function JobsStats({ counts }: { counts: JobsCounts | null }) {
  if (!counts) {
    return (
      <StatStrip
        className={STRIP_CLASS}
        stats={["Running now", COMPLETED_LABEL, FAILED_LABEL].map((label) => ({
          label,
          value: <Skeleton shape="tile" className="my-1.5 h-7 w-11 rounded-sm" />,
        }))}
      />
    );
  }
  return (
    <StatStrip
      className={STRIP_CLASS}
      stats={[
        {
          label: "Running now",
          value: counts.processing,
          aside: (
            <>
              {counts.processing > 0 ? <span className="wb-live-dot" /> : null}
              {counts.queued > 0 ? (
                <span className={cn(STAT_CHIP, "bg-raised text-fg-secondary")}>
                  {counts.queued} queued
                </span>
              ) : null}
            </>
          ),
        },
        { label: COMPLETED_LABEL, value: counts.completed },
        {
          label: FAILED_LABEL,
          value: counts.failed,
          aside:
            counts.failedToday > 0 ? (
              <span className={cn(STAT_CHIP, "bg-bad-tint text-bad")}>
                {counts.failedToday} today
              </span>
            ) : null,
        },
      ]}
    />
  );
}

const STRIP_CLASS = cn(
  "shrink-0 md:[&>.wb-stat:last-child]:pr-6",
  "max-md:flex-col max-md:px-5 max-md:py-1",
  "max-md:[&>.wb-stat]:h-[60px] max-md:[&>.wb-stat]:flex-none max-md:[&>.wb-stat]:flex-row max-md:[&>.wb-stat]:items-center max-md:[&>.wb-stat]:justify-between",
  "max-md:[&>.wb-stat]:border-l-0 max-md:[&>.wb-stat]:px-0",
  "max-md:[&>.wb-stat+.wb-stat]:border-t max-md:[&>.wb-stat+.wb-stat]:border-hairline"
);

const STAT_CHIP =
  "inline-flex h-[22px] shrink-0 items-center whitespace-pre rounded-full px-[9px] text-[12px] font-semibold leading-4 tracking-normal";

const COMPLETED_LABEL = `Completed ${JOBS_HISTORY_DAYS} days`;
const FAILED_LABEL = `Failed ${JOBS_HISTORY_DAYS} days`;
