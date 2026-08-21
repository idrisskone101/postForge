import {
  formatBytes,
  getStringInput,
  parseSourceVideo,
} from "@/components/clone-output/parse";
import type {
  CloneOutputReviewModel,
  CloneOutputReviewView,
} from "@/components/clone-output/types";

export function bindCloneOutputReview(
  review: CloneOutputReviewModel,
  featuredIndex: number,
  onSelectVariant: (index: number) => void
): CloneOutputReviewView {
  const { job } = review;
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
    ? [
        featured.width && featured.height
          ? `${featured.width}x${featured.height}`
          : null,
        formatBytes(featured.fileSizeBytes),
      ]
        .filter(Boolean)
        .join(" | ")
    : null;

  return {
    ...review,
    featured,
    featuredSize,
    previewWidth: featured?.width ?? sourceVideo?.width,
    previewHeight: featured?.height ?? sourceVideo?.height,
    isActive: job.status === "queued" || job.status === "processing",
    isCompleted: job.status === "completed",
    isFailed: job.status === "failed",
    sourceVideo,
    sourceTitle,
    sourceUrl,
    sourcePreviewUrl,
    avatarId,
    avatarPreviewUrl,
    identityName,
    reference,
    onSelectVariant,
  };
}
