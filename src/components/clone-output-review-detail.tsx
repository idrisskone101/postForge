"use client";

import { useState } from "react";
import { CloneOutputReviewActions } from "@/components/clone-output/actions";
import { CloneOutputReviewHeader } from "@/components/clone-output/header";
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

export function CloneOutputReviewDetail({
  review,
}: {
  review: CloneOutputReviewModel;
}) {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const view = bindCloneOutputReview(review, featuredIndex, setFeaturedIndex);

  return (
    <div className="pf-content-viewport min-w-0 bg-[var(--pf-canvas)]">
      <CloneOutputReviewHeader review={view} />

      <div className="mx-auto grid min-w-0 max-w-[1280px] gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,64fr)_minmax(340px,36fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <CloneOutputReviewPreview review={view} />
          <CloneOutputReviewActions review={view} />
        </div>

        <CloneOutputReviewSidebar review={view} />
      </div>
    </div>
  );
}
