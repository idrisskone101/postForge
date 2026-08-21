import type { SerializedOutputReviewStatus } from "@/lib/output-review-status";
import { cn } from "@/lib/utils";

export function ReviewStatePill({
  status,
}: {
  status: SerializedOutputReviewStatus;
}) {
  const approved = status.value === "approved_output";
  const rejected = status.value === "rejected_output";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        approved &&
          "border-[var(--pf-success)]/30 bg-[var(--pf-success)]/10 text-[var(--pf-success)]",
        rejected &&
          "border-[var(--pf-danger)]/30 bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]",
        !approved &&
          !rejected &&
          "border-[var(--pf-border)] bg-[var(--pf-active)] text-[var(--pf-muted)]"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          approved && "bg-[#4ADE80]",
          rejected && "bg-[#F87171]",
          !approved && !rejected && "bg-[#FBBF24]"
        )}
      />
      {status.label}
    </span>
  );
}
