"use client";

import { useState } from "react";
import {
  OUTPUT_REVIEW_STATUSES,
  type OutputReviewStatus,
  type SerializedOutputReviewStatus,
} from "@/lib/output-review-status";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { patchGalleryReviewStatus } from "./review-api";
import type { GalleryFeedback } from "./types";

export function GalleryReviewStatusControl({
  outputId,
  reviewStatus,
  compact = false,
  onStatusChange,
  onFeedback,
}: {
  outputId: string;
  reviewStatus: SerializedOutputReviewStatus;
  compact?: boolean;
  onStatusChange?: (status: SerializedOutputReviewStatus) => void;
  onFeedback?: (feedback: GalleryFeedback) => void;
}) {
  const [pendingStatus, setPendingStatus] = useState<OutputReviewStatus | null>(
    null
  );

  const updateStatus = async (nextStatus: OutputReviewStatus) => {
    if (pendingStatus || nextStatus === reviewStatus.value) return;
    setPendingStatus(nextStatus);
    try {
      const nextReviewStatus = await patchGalleryReviewStatus(
        outputId,
        nextStatus
      );
      onStatusChange?.(nextReviewStatus);
      onFeedback?.({
        tone: "success",
        message: `Asset marked ${nextReviewStatus.label.toLowerCase()}.`,
      });
    } catch {
      onFeedback?.({
        tone: "error",
        message: "The review status could not be updated. Try again.",
      });
    } finally {
      setPendingStatus(null);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-border bg-background p-1",
        compact ? "w-fit gap-1" : "justify-between gap-2"
      )}
      aria-label={`Output review status: ${reviewStatus.label}`}
    >
      {!compact && (
        <span className="min-w-0 truncate px-2 text-[13px] font-semibold">
          {reviewStatus.label}
        </span>
      )}
      <div className="flex items-center gap-1">
        {OUTPUT_REVIEW_STATUSES.map((status) => {
          const Icon = reviewStatusIcons[status.value];
          const isActive = reviewStatus.value === status.value;
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
                "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                isActive &&
                  status.value === "needs_review" &&
                  "bg-muted text-foreground",
                isActive &&
                  status.value === "approved_output" &&
                  "bg-accent-green/10 text-accent-green",
                isActive &&
                  status.value === "rejected_output" &&
                  "bg-destructive/10 text-destructive"
              )}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Icon className="size-3.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


const reviewStatusIcons = {
  needs_review: CircleDashed,
  approved_output: CheckCircle2,
  rejected_output: XCircle,
} satisfies Record<OutputReviewStatus, typeof CircleDashed>;