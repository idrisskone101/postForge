"use client";

import { Check, CircleX } from "lucide-react";
import { getGenerationStatusCopy, type JobDetail } from "@/lib/generation-editor";

export function JobStatusBadge({
  status,
  queueStage,
}: {
  status: JobDetail["status"];
  queueStage: JobDetail["queueStage"];
}) {
  const copy = getGenerationStatusCopy(status, queueStage);

  if (status === "completed") {
    return (
      <span className="pf-status-success inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <Check className="size-3" />
        <span className="truncate">{copy.label}</span>
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="pf-status-danger inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <CircleX className="size-3" />
        <span className="truncate">{copy.label}</span>
      </span>
    );
  }

  if (status === "processing") {
    return (
      <span className="pf-status-warning inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <span className="pf-lamp" />
        <span className="truncate">{copy.label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-[var(--pf-border)] bg-[var(--pf-active)] px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--pf-muted)]">
      <span className="truncate">{copy.label}</span>
    </span>
  );
}
