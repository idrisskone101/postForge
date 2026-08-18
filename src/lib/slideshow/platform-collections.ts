import {
  isCollectionAssetRecord,
  isCollectionRecord,
  type CollectionAssetRecord,
  type CollectionFeatureRecord,
} from "@/lib/collections";
import {
  collectionImagesFor,
  platformCollectionAssetIdFromUrl,
  platformCollectionAssetUrl,
} from "@/lib/collections-read-model";
import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";

export {
  platformCollectionAssetIdFromUrl,
  platformCollectionAssetUrl,
} from "@/lib/collections-read-model";

export type PlatformCollectionImage = {
  id: string;
  url: string;
  localPath: string;
};

export async function readPlatformCollection(collectionId: string): Promise<{
  id: string;
  name: string;
  images: PlatformCollectionImage[];
} | null> {
  const records =
    await readWorkspaceFeatureRecords<CollectionFeatureRecord>("collections");
  const collection = records
    .filter(isCollectionRecord)
    .find((candidate) => candidate.id === collectionId);
  if (!collection) return null;

  const assets = records.filter(isCollectionAssetRecord);
  return {
    id: collection.id,
    name: collection.name,
    images: collectionImagesFor(collection, assets),
  };
}

export async function platformCollectionExists(collectionId: string) {
  return (await readPlatformCollection(collectionId)) !== null;
}

export async function resolvePlatformCollectionImageLocalPaths(
  urls: readonly string[],
): Promise<Array<{ url: string; localPath: string }>> {
  const wanted = new Map<string, string>();
  urls.forEach((url) => {
    const assetId = platformCollectionAssetIdFromUrl(url);
    if (assetId && !wanted.has(assetId)) wanted.set(assetId, url);
  });
  if (!wanted.size) return [];

  const records =
    await readWorkspaceFeatureRecords<CollectionFeatureRecord>("collections");
  return records
    .filter(isCollectionAssetRecord)
    .filter((asset) => wanted.has(asset.id))
    .map((asset) => ({
      url: wanted.get(asset.id) ?? platformCollectionAssetUrl(asset.id),
      localPath: asset.localPath,
    }));
}
