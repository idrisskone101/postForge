import { downloadFile } from "@/lib/utils/download";
import type { OutputReviewStatus, SerializedOutputReviewStatus } from "@/lib/output-review-status";
import type { GalleryItem } from "@/components/gallery/types";
import { patchGalleryReviewStatus } from "@/components/gallery/review-api";
import { getFailedGalleryActionIds, type GalleryPage, type ReviewFilter } from "./gallery-models";

export async function fetchGalleryPage(params: {
  type: string;
  sort: string;
  reviewStatus: ReviewFilter;
  cursor?: string | null;
}): Promise<GalleryPage> {
  const search = new URLSearchParams({
    type: params.type,
    sort: params.sort,
    reviewStatus: params.reviewStatus,
  });
  if (params.cursor) search.set("cursor", params.cursor);
  const response = await fetch(`/api/gallery?${search.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load gallery.");
  }
  return (await response.json()) as GalleryPage;
}

export async function deleteGalleryFile(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
    return response.ok;
  } catch {
    return false;
  }
}

export async function downloadGalleryFiles(
  ids: readonly string[],
  items: readonly GalleryItem[]
): Promise<{ downloadedIds: string[]; failedIds: string[] }> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const item = items.find((candidate) => candidate.id === id);
        await downloadFile(`/api/files/${id}/download`, item?.filename);
        return id;
      } catch {
        return null;
      }
    })
  );
  const downloadedIds = results.filter((id): id is string => id !== null);
  return {
    downloadedIds,
    failedIds: getFailedGalleryActionIds(ids, downloadedIds),
  };
}

export async function patchGalleryReviewStatuses(
  ids: readonly string[],
  status: OutputReviewStatus
): Promise<{
  updated: Array<{ id: string; reviewStatus: SerializedOutputReviewStatus }>;
  failedIds: string[];
}> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const reviewStatus = await patchGalleryReviewStatus(id, status);
        return { id, reviewStatus };
      } catch {
        return null;
      }
    })
  );
  const updated = results.filter(
    (
      result
    ): result is { id: string; reviewStatus: SerializedOutputReviewStatus } =>
      result !== null
  );
  return {
    updated,
    failedIds: getFailedGalleryActionIds(
      ids,
      updated.map((entry) => entry.id)
    ),
  };
}

export async function copyHandoffUrls(ids: readonly string[]): Promise<void> {
  if (!navigator.clipboard) throw new Error("Clipboard unavailable");
  const urls = ids.map((id) =>
    new URL(`/api/files/${id}`, window.location.origin).toString()
  );
  await navigator.clipboard.writeText(urls.join("\n"));
}

export function replaceGalleryRouteFilters(
  updates: Partial<{
    reviewStatus: ReviewFilter;
    type: string;
    sort: string;
  }>
) {
  const url = new URL(window.location.href);
  if (updates.reviewStatus) {
    url.searchParams.set("reviewStatus", updates.reviewStatus);
  }
  if (updates.type) url.searchParams.set("type", updates.type);
  if (updates.sort) url.searchParams.set("sort", updates.sort);
  window.history.replaceState(window.history.state, "", url);
}

