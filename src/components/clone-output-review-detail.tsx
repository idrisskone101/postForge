"use client";

import { useState } from "react";
import { Toast } from "@/components/workbench";
import { CloneOutputReviewActions } from "@/components/clone-output/actions";
import { CloneOutputReviewPreview } from "@/components/clone-output/preview";
import { CloneOutputReviewSidebar } from "@/components/clone-output/sidebar";
import type {
  CloneOutputActionFeedback,
  CloneOutputReviewJob,
  CloneOutputReviewModel,
  CloneOutputReviewOutput,
} from "@/components/clone-output/types";
import { bindCloneOutputReview } from "@/components/clone-output/view-model";

export type {
  CloneOutputActionFeedback,
  CloneOutputReviewJob,
  CloneOutputReviewOutput,
};

export function CloneOutputReviewDetail({ review }: { review: CloneOutputReviewModel }) {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const view = bindCloneOutputReview(review, featuredIndex, setFeaturedIndex);
  const { actionFeedback, onDismissFeedback } = review;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row">
      <CloneOutputReviewPreview review={view} />
      <div className="grid min-w-0 content-start gap-3 md:grid-cols-2 xl:flex xl:w-[380px] xl:shrink-0 xl:flex-col">
        <CloneOutputReviewActions review={view} />
        <CloneOutputReviewSidebar review={view} />
      </div>
      {actionFeedback && (
        <div className="wb-toast-region">
          <Toast
            key={`${actionFeedback.tone}:${actionFeedback.message}`}
            toast={{
              id: `${actionFeedback.tone}:${actionFeedback.message}`,
              tone: actionFeedback.tone === "success" ? "ok" : "bad",
              message: actionFeedback.message,
            }}
            onDismiss={onDismissFeedback ?? noop}
          />
        </div>
      )}
    </div>
  );
}

function noop() {}
