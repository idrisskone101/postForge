import {
  isCollectionAssetRecord,
  isCollectionRecord,
  type CollectionFeatureRecord,
} from "@/lib/collections";
import { fetchWorkspaceFeature } from "@/lib/workspace-features-client";

export type PlatformCollectionSummary = {
  id: string;
  name: string;
  imageCount: number;
  imageUrls: string[];
};

export type PinterestCandidate = {
  id: string;
  imageUrl: string;
  sourceUrl: string;
};

export function platformCollectionAssetUrl(assetId: string) {
  return `/api/collection-assets/${encodeURIComponent(assetId)}`;
}

export async function fetchPlatformCollections(): Promise<
  PlatformCollectionSummary[]
> {
  const { records } =
    await fetchWorkspaceFeature<CollectionFeatureRecord>("collections");
  const assets = records.filter(isCollectionAssetRecord);
  return records.filter(isCollectionRecord).map((collection) => ({
    id: collection.id,
    name: collection.name,
    imageCount: collection.assetIds.length,
    imageUrls: collection.assetIds
      .map((assetId) => assets.find((asset) => asset.id === assetId))
      .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
      .map((asset) => platformCollectionAssetUrl(asset.id)),
  }));
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
}): Promise<PinterestCandidate[]> {
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
    }))
    .filter((candidate) => candidate.id && candidate.imageUrl);
  if (!mapped.length) {
    throw new Error("Pinterest returned no usable images.");
  }
  return mapped;
}

export async function importPinterestImages(input: {
  urls: string[];
  name?: string;
}): Promise<{ imported: number; skipped: number }> {
  const response = await fetch("/api/collection-assets/pinterest-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse(response);
  const record = isRecord(data) ? data : {};
  return {
    imported: typeof record.imported === "number" ? record.imported : 0,
    skipped: Array.isArray(record.skipped) ? record.skipped.length : 0,
  };
}
