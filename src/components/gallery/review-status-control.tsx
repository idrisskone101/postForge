"use client";

import { useState } from "react";
import { Segmented } from "@/components/workbench/segmented";
import {
  OUTPUT_REVIEW_STATUSES,
  type OutputReviewStatus,
  type SerializedOutputReviewStatus,
} from "@/lib/output-review-status";
import { reviewActionLabel, reviewStatusLabel } from "./format";
import { patchGalleryReviewStatus } from "./review-api";
import type { GalleryFeedback } from "./types";

export function GalleryReviewStatusControl({
  outputId,
  reviewStatus,
  onStatusChange,
  onFeedback,
}: {
  outputId: string;
  reviewStatus: SerializedOutputReviewStatus;
  onStatusChange?: (status: SerializedOutputReviewStatus) => void;
  onFeedback?: (feedback: GalleryFeedback) => void;
}) {
  const [pendingStatus, setPendingStatus] = useState<OutputReviewStatus | null>(null);

  const updateStatus = async (nextStatus: OutputReviewStatus) => {
    if (pendingStatus || nextStatus === reviewStatus.value) return;
    setPendingStatus(nextStatus);
    try {
      const nextReviewStatus = await patchGalleryReviewStatus(outputId, nextStatus);
      onStatusChange?.(nextReviewStatus);
      onFeedback?.({
        tone: "success",
        message:
          nextStatus === "needs_review"
            ? "Review cleared back to needs review."
            : `Asset marked ${reviewStatusLabel[nextStatus].toLowerCase()}.`,
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

  const current = pendingStatus ?? reviewStatus.value;
  return (
    <Segmented
      label={`Output review status: ${reviewStatusLabel[reviewStatus.value]}`}
      value={current}
      onChange={(value) => void updateStatus(value)}
      options={OUTPUT_REVIEW_STATUSES.map((status) => ({
        value: status.value,
        label: (status.value === current ? reviewStatusLabel : reviewActionLabel)[status.value],
      }))}
      className="wb-segmented-block w-full"
    />
  );
}
