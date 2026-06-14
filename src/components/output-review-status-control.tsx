"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import {
  OUTPUT_REVIEW_STATUSES,
  type OutputReviewStatus,
  type SerializedOutputReviewStatus,
} from "@/lib/output-review-status";
import { cn } from "@/lib/utils";

const statusIcons = {
  needs_review: CircleDashed,
  approved_output: CheckCircle2,
  rejected_output: XCircle,
} satisfies Record<OutputReviewStatus, typeof CircleDashed>;

const statusClasses = {
  needs_review: "border-border text-muted-foreground hover:text-foreground",
  approved_output:
    "border-accent-green/40 text-accent-green hover:bg-accent-green/10",
  rejected_output: "border-red-400/40 text-red-400 hover:bg-red-500/10",
} satisfies Record<OutputReviewStatus, string>;

const activeStatusClasses = {
  needs_review: "bg-muted text-foreground",
  approved_output: "bg-accent-green/15 text-accent-green",
  rejected_output: "bg-red-500/15 text-red-400",
} satisfies Record<OutputReviewStatus, string>;

export function OutputReviewStatusControl({
  outputId,
  reviewStatus,
  compact = false,
  onStatusChange,
}: {
  outputId: string;
  reviewStatus: SerializedOutputReviewStatus;
  compact?: boolean;
  onStatusChange?: (status: SerializedOutputReviewStatus) => void;
}) {
  const [current, setCurrent] = useState(reviewStatus);
  const [pendingStatus, setPendingStatus] = useState<OutputReviewStatus | null>(
    null
  );

  const updateStatus = async (nextStatus: OutputReviewStatus) => {
    if (pendingStatus || nextStatus === current.value) return;

    setPendingStatus(nextStatus);
    try {
      const response = await fetch(`/api/files/${outputId}/review-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update output review status.");
      }

      const result = (await response.json()) as {
        reviewStatus: SerializedOutputReviewStatus;
      };
      setCurrent(result.reviewStatus);
      onStatusChange?.(result.reviewStatus);
    } finally {
      setPendingStatus(null);
    }
  };

  const CurrentIcon = statusIcons[current.value];

  return (
    <div
      className={cn(
        "flex items-center rounded-xl border border-border/60 bg-muted/30 p-1",
        compact ? "w-fit gap-1" : "min-w-0 justify-between gap-2"
      )}
      aria-label={`Output review status: ${current.label}`}
    >
      {!compact && (
        <div className="flex min-w-0 items-center gap-2 px-2">
          <CurrentIcon
            className={cn(
              "size-3.5 shrink-0",
              current.value === "approved_output" && "text-accent-green",
              current.value === "rejected_output" && "text-red-400",
              current.value === "needs_review" && "text-muted-foreground"
            )}
          />
          <span className="truncate text-[11px] font-semibold text-foreground">
            {current.label}
          </span>
        </div>
      )}
      <div
        className={cn(
          "flex shrink-0 items-center gap-1",
          compact && "gap-1.5 rounded-lg"
        )}
      >
        {OUTPUT_REVIEW_STATUSES.map((status) => {
          const Icon = statusIcons[status.value];
          const isActive = current.value === status.value;
          const isPending = pendingStatus === status.value;

          return (
            <button
              key={status.value}
              type="button"
              aria-label={`Mark as ${status.label}`}
              aria-pressed={isActive}
              title={status.label}
              disabled={pendingStatus !== null}
              onClick={(event) => {
                event.stopPropagation();
                void updateStatus(status.value);
              }}
              className={cn(
                "inline-flex size-7 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                statusClasses[status.value],
                isActive && activeStatusClasses[status.value],
                compact && "size-8 rounded-lg"
              )}
            >
              {isPending ? (
                <Loader2 className={cn("size-3 animate-spin", compact && "size-3.5")} />
              ) : (
                <Icon className={cn("size-3", compact && "size-3.5")} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
