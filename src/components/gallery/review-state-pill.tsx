import type { SerializedOutputReviewStatus } from "@/lib/output-review-status";
import { Check, CircleX } from "lucide-react";

export function ReviewStatePill({
  status,
}: {
  status: SerializedOutputReviewStatus;
}) {
  const approved = status.value === "approved_output";
  const rejected = status.value === "rejected_output";

  if (approved) {
    return (
      <span className="pf-status-success inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <Check className="size-3" />
        <span className="truncate">{status.label}</span>
      </span>
    );
  }

  if (rejected) {
    return (
      <span className="pf-status-danger inline-flex max-w-full items-center gap-1.5 px-2.5 py-0.5 text-[11px] capitalize">
        <CircleX className="size-3" />
        <span className="truncate">{status.label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-[var(--pf-border)] bg-[var(--pf-active)] px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--pf-muted)]">
      <span className="truncate">{status.label}</span>
    </span>
  );
}
