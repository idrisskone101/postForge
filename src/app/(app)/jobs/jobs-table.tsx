import Link from "next/link";
import { Icon } from "@/components/workbench/icon";
import { MediaImage } from "@/components/workbench/media-image";
import { cn } from "@/lib/utils";
import { toJobRow, type JobRowView } from "./jobs-activity-helpers";
import { JobsStatusCell } from "./jobs-status-cell";
import type { JobActivityItem } from "./types";

export function JobsTable({
  jobs,
  now,
}: {
  jobs: JobActivityItem[];
  now: Date;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="wb-table-head max-lg:hidden" aria-hidden="true">
        <span className="min-w-0 flex-1">Activity</span>
        <span className="w-[130px] shrink-0">Status</span>
        <span className="w-[120px] shrink-0">Created</span>
        <span className="w-20 shrink-0">Duration</span>
        <span className="w-16 shrink-0 text-right">Cost</span>
        <span className="w-16 shrink-0" />
      </div>
      <div className="flex min-w-0 flex-col">
        {jobs.map((job) => (
          <JobRow key={job.id} row={toJobRow(job, now)} />
        ))}
      </div>
    </div>
  );
}

function JobRow({ row }: { row: JobRowView }) {
  return (
    <Link
      href={row.href}
      prefetch={false} // prefetch-off: 40 rows per page each point at a heavy dynamic detail route
      className="wb-row group min-w-0 transition-[background-color] duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised/60 focus-visible:outline-offset-[-2px] max-lg:items-start max-lg:gap-3 max-lg:px-1 max-lg:py-3 lg:h-[60px]"
    >
      <span className="flex min-w-0 flex-1 items-start gap-3 lg:items-center">
        <JobThumb preview={row.preview} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="wb-row-title">{row.title}</span>
          <span
            className={cn(
              "wb-row-sub",
              row.error &&
                "max-lg:line-clamp-2 max-lg:whitespace-normal group-focus-visible:whitespace-normal",
            )}
            data-tone={row.error ? "bad" : undefined}
            title={row.error ?? undefined}
          >
            {row.sub}
          </span>
          <span className="flex items-center gap-2.5 pt-1.5 lg:hidden">
            <JobsStatusCell status={row.status} />
            <span className="wb-mono whitespace-nowrap text-fg-secondary">
              {row.created}
              <span className="pl-3">{row.duration}</span>
            </span>
          </span>
        </span>
      </span>
      <span className="flex w-[130px] shrink-0 items-center max-lg:hidden">
        <JobsStatusCell status={row.status} />
      </span>
      <MonoCell value={row.created} className="w-[120px] max-lg:hidden" />
      <MonoCell value={row.duration} className="w-20 max-lg:hidden" />
      <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5 lg:contents">
        <MonoCell value={row.cost} className="text-right text-fg lg:w-16" />
        <span className="flex justify-end text-fg-muted lg:w-16 lg:shrink-0">
          <Icon name="chevron-right" size={16} />
        </span>
      </span>
    </Link>
  );
}

function MonoCell({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "wb-mono shrink-0 whitespace-nowrap text-fg-secondary",
        className,
        value === "-" && "text-fg-muted",
      )}
    >
      {value}
    </span>
  );
}

function JobThumb({ preview }: { preview: JobRowView["preview"] }) {
  if (preview?.type === "video") {
    return (
      <span className="wb-thumb">
        <video
          src={`${preview.src}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          aria-hidden="true"
          tabIndex={-1}
          className="size-full object-cover"
        />
      </span>
    );
  }
  return (
    <span className="wb-thumb">
      {preview ? (
        <MediaImage
          src={preview.src}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : null}
    </span>
  );
}
