import {
  isCollectionAssetRecord,
  type CollectionAssetRecord,
  type CollectionRecord,
} from "@/lib/collections";

export function assetUrl(id: string) {
  return `/api/collection-assets/${encodeURIComponent(id)}`;
}

export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

export function assetsForCollection(
  collection: CollectionRecord,
  assets: readonly CollectionAssetRecord[]
) {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  return collection.assetIds
    .map((id) => byId.get(id))
    .filter(isCollectionAssetRecord);
}

export function createCollectionRecord(
  name: string,
  selectedAssetId: string | null
): CollectionRecord {
  const now = new Date().toISOString();
  return {
    id: `collection_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind: "collection",
    name: name.trim(),
    assetIds: selectedAssetId ? [selectedAssetId] : [],
    createdAt: now,
    updatedAt: now,
  };
}
