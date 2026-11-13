import { Meter } from "@/components/workbench/meter";
import { StatusBadge, type StatusTone } from "@/components/workbench/status-badge";
import type { JobRowStatus } from "./jobs-activity-helpers";

export function JobsStatusCell({ status }: { status: JobRowStatus }) {
  if (status.kind === "running") {
    return (
      <Meter
        label={status.label}
        value={status.progress}
        running
        className="w-24 flex-none"
      />
    );
  }
  return <StatusBadge tone={STATUS_TONE[status.kind]} label={status.label} />;
}

const STATUS_TONE: Record<Exclude<JobRowStatus["kind"], "running">, StatusTone> = {
  queued: "neutral",
  completed: "ok",
  failed: "bad",
};
