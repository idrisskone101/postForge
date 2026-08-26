import { Check, CircleX } from "lucide-react";
import { getJobStatusLabel, isActiveGenerationJob } from "@/lib/jobs/presentation";
import type { JobActivityItem } from "./types";

export function JobsStatusPill({ job }: { job: JobActivityItem }) {
  const label = getJobStatusLabel(job);
  const active = isActiveGenerationJob(job);

  if (job.status === "completed") {
    return (
      <span className="pf-status-success inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <Check className="size-3" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  if (job.status === "failed") {
    return (
      <span className="pf-status-danger inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <CircleX className="size-3" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  if (active) {
    return (
      <span className="pf-status-warning inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <span className="pf-lamp" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-[var(--pf-border)] bg-[var(--pf-active)] px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--pf-muted)]">
      <span className="truncate">{label}</span>
    </span>
  );
}
