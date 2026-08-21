"use client";

import { useState } from "react";
import { CloneOutputReviewActions } from "@/components/clone-output/actions";
import { CloneOutputReviewHeader } from "@/components/clone-output/header";
import {
  formatBytes,
  getStringInput,
  parseSourceVideo,
} from "@/components/clone-output/parse";
import { CloneOutputReviewPreview } from "@/components/clone-output/preview";
import { CloneOutputReviewSidebar } from "@/components/clone-output/sidebar";
import type {
  CloneOutputActionFeedback,
  CloneOutputReviewJob,
  CloneOutputReviewOutput,
} from "@/components/clone-output/types";
import type { OutputReviewStatus } from "@/lib/output-review-status";

export type {
  CloneOutputActionFeedback,
  CloneOutputReviewJob,
  CloneOutputReviewOutput,
};

export function CloneOutputReviewDetail({
  job,
  isRetrying,
  pendingReviewStatus = null,
  handoffState = "idle",
  actionFeedback = null,
  onBack,
  onRetry,
  onDownload,
  onReviewStatusChange,
  onHandoff,
  onNewClone,
}: {
  job: CloneOutputReviewJob;
  isRetrying: boolean;
  pendingReviewStatus?: OutputReviewStatus | null;
  handoffState?: "idle" | "pending" | "success" | "error";
  actionFeedback?: CloneOutputActionFeedback | null;
  onBack: () => void;
  onRetry: () => void;
  onDownload: (output: CloneOutputReviewOutput) => void;
  onReviewStatusChange?: (
    output: CloneOutputReviewOutput,
    status: OutputReviewStatus
  ) => void;
  onHandoff?: (output: CloneOutputReviewOutput) => void;
  onNewClone: () => void;
}) {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const isActive = job.status === "queued" || job.status === "processing";
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const featured = job.outputs[featuredIndex] ?? job.outputs[0];
  const sourceVideo = parseSourceVideo(job.input.sourceVideo);
  const avatarId = getStringInput(job.input, "avatarId");
  const avatarPreviewUrl = avatarId
    ? `/api/avatars/${encodeURIComponent(avatarId)}`
    : null;
  const identityName =
    getStringInput(job.input, "avatarName") ??
    getStringInput(job.input, "identityName") ??
    "AI avatar profile";
  const referenceImageFileId = getStringInput(job.input, "referenceImageFileId");
  const savedReferenceId = getStringInput(job.input, "savedReferenceId");
  const collectionAssetId = getStringInput(job.input, "collectionAssetId");
  const reference = savedReferenceId
    ? {
        id: savedReferenceId,
        label: "Saved clone reference",
        previewUrl: `/api/ugc-clone/references/${encodeURIComponent(savedReferenceId)}`,
      }
    : collectionAssetId
      ? {
          id: collectionAssetId,
          label: "Collection reference",
          previewUrl: `/api/files/${encodeURIComponent(collectionAssetId)}`,
        }
      : referenceImageFileId
        ? {
            id: referenceImageFileId,
            label: "Generated output reference",
            previewUrl: `/api/files/${encodeURIComponent(referenceImageFileId)}`,
          }
        : null;
  const sourceTitle =
    sourceVideo?.label ?? job.tikTokSource?.label ?? "Source clip unavailable";
  const sourceUrl = sourceVideo?.originalUrl ?? job.tikTokSource?.originalUrl;
  const sourcePreviewUrl = sourceVideo
    ? `/api/ugc-clone/preview?path=${encodeURIComponent(sourceVideo.localPath)}`
    : null;
  const featuredSize = featured
    ? [featured.width && featured.height ? `${featured.width}x${featured.height}` : null, formatBytes(featured.fileSizeBytes)]
        .filter(Boolean)
        .join(" | ")
    : null;
  const previewWidth = featured?.width ?? sourceVideo?.width;
  const previewHeight = featured?.height ?? sourceVideo?.height;

  return (
    <div className="pf-content-viewport min-w-0 animate-fade-in-up bg-background">
      <CloneOutputReviewHeader
        job={job}
        featured={featured}
        isCompleted={isCompleted}
        isFailed={isFailed}
        isRetrying={isRetrying}
        handoffState={handoffState}
        onBack={onBack}
        onRetry={onRetry}
        onDownload={onDownload}
        onHandoff={onHandoff}
      />

      <div className="mx-auto grid min-w-0 max-w-[1280px] gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,64fr)_minmax(340px,36fr)] lg:px-8">
        <div className="min-w-0 space-y-4">
          <CloneOutputReviewPreview
            job={job}
            featured={featured}
            featuredSize={featuredSize}
            previewWidth={previewWidth}
            previewHeight={previewHeight}
            isActive={isActive}
            isFailed={isFailed}
            isCompleted={isCompleted}
            onDownload={onDownload}
            onSelectVariant={setFeaturedIndex}
          />
          <CloneOutputReviewActions
            featured={featured}
            pendingReviewStatus={pendingReviewStatus}
            actionFeedback={actionFeedback}
            onReviewStatusChange={onReviewStatusChange}
            onNewClone={onNewClone}
          />
        </div>

        <CloneOutputReviewSidebar
          job={job}
          featured={featured}
          sourceVideo={sourceVideo}
          sourceTitle={sourceTitle}
          sourceUrl={sourceUrl}
          sourcePreviewUrl={sourcePreviewUrl}
          avatarId={avatarId}
          avatarPreviewUrl={avatarPreviewUrl}
          identityName={identityName}
          reference={reference}
        />
      </div>
    </div>
  );
}
