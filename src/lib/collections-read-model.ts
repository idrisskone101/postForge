import {
  isCollectionAssetRecord,
  isCollectionRecord,
  type CollectionAssetRecord,
  type CollectionFeatureRecord,
  type CollectionRecord,
} from "@/lib/collections";

export type PlatformCollectionSummary = {
  id: string;
  name: string;
  imageCount: number;
  imageUrls: string[];
};

const ASSET_URL_PATTERN = /^\/api\/collection-assets\/([^/?#]+)$/;

export function platformCollectionAssetUrl(assetId: string) {
  return `/api/collection-assets/${encodeURIComponent(assetId)}`;
}

export function platformCollectionAssetIdFromUrl(url: string) {
  const match = ASSET_URL_PATTERN.exec(url);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function summarizePlatformCollections(
  records: readonly CollectionFeatureRecord[],
): PlatformCollectionSummary[] {
  const assets = records.filter(isCollectionAssetRecord);
  return records.filter(isCollectionRecord).map((collection) => ({
    id: collection.id,
    name: collection.name,
    imageCount: collection.assetIds.length,
    imageUrls: collection.assetIds
      .map((assetId) => assets.find((asset) => asset.id === assetId))
      .filter((asset): asset is CollectionAssetRecord => Boolean(asset))
      .map((asset) => platformCollectionAssetUrl(asset.id)),
  }));
}

export function collectionImagesFor(
  collection: CollectionRecord,
  assets: readonly CollectionAssetRecord[],
) {
  return collection.assetIds
    .map((assetId) => assets.find((asset) => asset.id === assetId))
    .filter((asset): asset is CollectionAssetRecord => Boolean(asset))
    .map((asset) => ({
      id: asset.id,
      url: platformCollectionAssetUrl(asset.id),
      localPath: asset.localPath,
    }));
}
