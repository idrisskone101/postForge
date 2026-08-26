import {
  isCollectionAssetRecord,
  type CollectionAssetRecord,
  type CollectionRecord,
} from "@/lib/collections";

export function assetUrl(id: string) {
  return `/api/collection-assets/${encodeURIComponent(id)}`;
}

export function formatAssetSizeMb(fileSizeBytes: number) {
  return (fileSizeBytes / 1_000_000).toFixed(1);
}

export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

export function formatImageCount(count: number) {
  return `${count} image${count === 1 ? "" : "s"}`;
}

export function previewAssetsForCollection(
  collection: CollectionRecord,
  assets: readonly CollectionAssetRecord[],
  limit = 4
) {
  return collection.assetIds
    .map((id) => assets.find((asset) => asset.id === id))
    .filter(isCollectionAssetRecord)
    .slice(0, limit);
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
