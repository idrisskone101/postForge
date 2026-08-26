import {
  OUTPUT_REVIEW_STATUSES,
  serializeOutputReviewStatus,
} from "@/lib/output-review-status";
import type { OutputReviewStatus } from "@/lib/output-review-status";
import type { GalleryItem } from "@/components/gallery/types";

export type ReviewFilter = OutputReviewStatus | "all";
export type GalleryTypeFilter = "all" | "image" | "video";
export type GallerySortOrder = "newest" | "oldest";

export type GalleryItemInput = Omit<GalleryItem, "type" | "reviewStatus"> & {
  type: string;
  reviewStatus: {
    value: string;
    label: string;
    tone: string;
  };
};

export interface GalleryPageClientProps {
  initialPage: Omit<GalleryPage, "items"> & { items: GalleryItemInput[] };
  initialType?: GalleryTypeFilter;
  initialSort?: GallerySortOrder;
  initialReviewStatus?: ReviewFilter;
}

export interface GalleryPage {
  items: GalleryItem[];
  nextCursor: string | null;
  hasMore: boolean;
  reviewCounts?: Record<ReviewFilter, number>;
}

export const filterOptions = [
  { value: "all", label: "All media" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
] as const;

export const reviewFilters = [
  ...OUTPUT_REVIEW_STATUSES,
  { value: "all", label: "All", tone: "neutral" },
] as const;

export function normalizeGalleryItem(item: GalleryItemInput): GalleryItem {
  return {
    ...item,
    type: item.type === "image" ? "image" : "video",
    reviewStatus: serializeOutputReviewStatus(item.reviewStatus.value),
  };
}

export function getFailedGalleryActionIds(
  attemptedIds: readonly string[],
  successfulIds: readonly string[]
) {
  const successful = new Set(successfulIds);
  return attemptedIds.filter((id) => !successful.has(id));
}

export function emptyReviewCounts(
  items: GalleryItemInput[]
): Record<ReviewFilter, number> {
  return {
    needs_review: items.filter(
      (item) => item.reviewStatus.value === "needs_review"
    ).length,
    approved_output: items.filter(
      (item) => item.reviewStatus.value === "approved_output"
    ).length,
    rejected_output: items.filter(
      (item) => item.reviewStatus.value === "rejected_output"
    ).length,
    all: items.length,
  };
}

export function galleryLoadError(error: unknown) {
  return error instanceof Error ? error.message : "Failed to load gallery.";
}

export function filterGalleryItems(
  items: GalleryItem[],
  {
    reviewFilter,
    typeFilter,
    query,
  }: {
    reviewFilter: ReviewFilter;
    typeFilter: GalleryTypeFilter;
    query: string;
  }
) {
  let result = items;
  if (reviewFilter !== "all") {
    result = result.filter((item) => item.reviewStatus.value === reviewFilter);
  }
  if (typeFilter !== "all") {
    result = result.filter((item) => item.type === typeFilter);
  }
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return result;
  return result.filter((item) =>
    [item.model, item.jobId, item.prompt, item.filename]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery))
  );
}

export function galleryReviewSummary({
  reviewFilter,
  reviewCounts,
  totalCount,
}: {
  reviewFilter: ReviewFilter;
  reviewCounts: Record<ReviewFilter, number>;
  totalCount: number;
}) {
  const activeReviewLabel =
    reviewFilters.find((filter) => filter.value === reviewFilter)?.label ?? "All";
  const activeTotal = reviewCounts[reviewFilter] ?? totalCount;
  const countCopy =
    totalCount < activeTotal
      ? `Showing ${totalCount} of ${activeTotal}`
      : `${activeTotal}`;
  return reviewFilter === "needs_review"
    ? `${countCopy} output${activeTotal === 1 ? "" : "s"} needing review`
    : `${countCopy} output${activeTotal === 1 ? "" : "s"} in ${activeReviewLabel.toLowerCase()}`;
}

export function appendGalleryItems(
  previous: GalleryItem[],
  incoming: GalleryItem[]
) {
  const existing = new Set(previous.map((item) => item.id));
  return [...previous, ...incoming.filter((item) => !existing.has(item.id))];
}

