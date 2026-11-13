"use client";

import { useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import {
  OUTPUT_REVIEW_STATUSES,
  type OutputReviewStatus,
  type SerializedOutputReviewStatus,
} from "@/lib/output-review-status";
import { cn } from "@/lib/utils";

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
        "flex items-center rounded-full bg-raised p-1",
        compact ? "w-fit gap-1" : "min-w-0 justify-between gap-2"
      )}
      aria-label={`Output review status: ${current.label}`}
    >
      {!compact && (
        <div className="flex min-w-0 items-center gap-2 px-2">
          <CurrentIcon
            className={cn(
              "size-3.5 shrink-0",
              current.value === "approved_output" && "text-ok",
              current.value === "rejected_output" && "text-bad",
              current.value === "needs_review" && "text-warn"
            )}
          />
          <span className="truncate text-[12px] font-semibold text-fg">
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
                "inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-fg-secondary transition-[background-color,color] duration-[var(--pf-dur-feedback)] ease-pf disabled:cursor-not-allowed disabled:opacity-60",
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


const statusIcons = {
  needs_review: CircleDashed,
  approved_output: CheckCircle2,
  rejected_output: XCircle,
} satisfies Record<OutputReviewStatus, typeof CircleDashed>;

const statusClasses = {
  needs_review: "hover:text-fg",
  approved_output: "hover:bg-ok-tint hover:text-ok",
  rejected_output: "hover:bg-bad-tint hover:text-bad",
} satisfies Record<OutputReviewStatus, string>;

const activeStatusClasses = {
  needs_review: "bg-warn-tint text-warn",
  approved_output: "bg-ok-tint text-ok",
  rejected_output: "bg-bad-tint text-bad",
} satisfies Record<OutputReviewStatus, string>;