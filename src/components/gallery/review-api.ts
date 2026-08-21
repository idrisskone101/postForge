import type {
  OutputReviewStatus,
  SerializedOutputReviewStatus,
} from "@/lib/output-review-status";

export async function patchGalleryReviewStatus(
  outputId: string,
  reviewStatus: OutputReviewStatus
): Promise<SerializedOutputReviewStatus> {
  const response = await fetch(`/api/files/${outputId}/review-status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewStatus }),
  });
  if (!response.ok) throw new Error("Review update failed");
  const result = (await response.json()) as {
    reviewStatus: SerializedOutputReviewStatus;
  };
  return result.reviewStatus;
}
