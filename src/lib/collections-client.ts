import { type CollectionFeatureRecord } from "@/lib/collections";
import type { PinterestImageCandidate } from "@/lib/collections/pinterest-types";
import {
  platformCollectionAssetUrl,
  summarizePlatformCollections,
  type PlatformCollectionSummary,
} from "@/lib/collections-read-model";
import { fetchWorkspaceFeature } from "@/lib/workspace-features-client";
import { MAX_PINTEREST_IMPORT_IMAGES } from "@/lib/pinterest-constants";

export type { PlatformCollectionSummary, PinterestImageCandidate };
export type PinterestCandidate = PinterestImageCandidate;
export { platformCollectionAssetUrl };

export type PinterestCandidatePage = {
  candidates: PinterestCandidate[];
  cursor: string | null;
  hasMore: boolean;
};

export type PinterestImportResult = {
  imported: number;
  skipped: number;
  collectionId: string | null;
  assetIds: string[];
  assets: Array<{ id: string; imageUrl: string }>;
};

export function pinterestImageUrlsInSelectionOrder(
  candidates: PinterestCandidate[],
  selectedIds: string[],
) {
  const candidatesById = new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  );
  return selectedIds
    .map((id) => candidatesById.get(id)?.imageUrl)
    .filter((url): url is string => Boolean(url));
}

export async function fetchPlatformCollections(): Promise<
  PlatformCollectionSummary[]
> {
  const { records } =
    await fetchWorkspaceFeature<CollectionFeatureRecord>("collections");
  return summarizePlatformCollections(records);
}

async function readJsonResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String(data.error)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function fetchPinterestCandidates(input: {
  source: "search" | "board";
  query: string;
  cursor?: string;
}): Promise<PinterestCandidatePage> {
  const response = await fetch("/api/collection-assets/pinterest/candidates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse(response);
  const candidates = isRecord(data) && Array.isArray(data.candidates)
    ? data.candidates.filter(isRecord)
    : [];
  const mapped = candidates
    .map((candidate) => ({
      id: typeof candidate.id === "string" ? candidate.id : "",
      imageUrl:
        typeof candidate.imageUrl === "string" ? candidate.imageUrl : "",
      sourceUrl:
        typeof candidate.sourceUrl === "string" ? candidate.sourceUrl : "",
      title: typeof candidate.title === "string" ? candidate.title : undefined,
      altText:
        typeof candidate.altText === "string" ? candidate.altText : undefined,
      width: typeof candidate.width === "number" ? candidate.width : undefined,
      height: typeof candidate.height === "number" ? candidate.height : undefined,
    }))
    .filter((candidate) => candidate.id && candidate.imageUrl);
  return {
    candidates: mapped,
    cursor:
      isRecord(data) && typeof data.cursor === "string" ? data.cursor : null,
    hasMore: isRecord(data) && data.hasMore === true,
  };
}

export async function importPinterestImages(input: {
  urls: string[];
  name?: string;
}): Promise<PinterestImportResult> {
  if (input.urls.length > MAX_PINTEREST_IMPORT_IMAGES) {
    throw new Error(
      `Select up to ${MAX_PINTEREST_IMPORT_IMAGES} images per import.`,
    );
  }
  const response = await fetch("/api/collection-assets/pinterest-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse(response);
  const record = isRecord(data) ? data : {};
  const collection = isRecord(record.collection) ? record.collection : {};
  const assetIds = Array.isArray(collection.assetIds)
    ? collection.assetIds.filter((value): value is string => typeof value === "string")
    : [];
  return {
    imported: typeof record.imported === "number" ? record.imported : 0,
    skipped: Array.isArray(record.skipped) ? record.skipped.length : 0,
    collectionId: typeof collection.id === "string" ? collection.id : null,
    assetIds,
    assets: assetIds.map((id) => ({ id, imageUrl: platformCollectionAssetUrl(id) })),
  };
}
