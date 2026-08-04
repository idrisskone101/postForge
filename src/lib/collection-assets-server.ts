import { uploadToFalStorage } from "@/lib/ai/fal-client";
import {
  isCollectionAssetRecord,
  type CollectionAssetRecord,
  type CollectionFeatureRecord,
} from "@/lib/collections";
import { isStoragePathUnder, storage } from "@/lib/storage";
import { readWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";

const MAX_COLLECTION_REFERENCES = 14;

export class CollectionAssetRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectionAssetRequestError";
  }
}

export function parseCollectionAssetIds(
  value: unknown,
  maximum = MAX_COLLECTION_REFERENCES
): string[] {
  if (value === undefined || value === null) return [];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > maximum ||
    !value.every(
      (id) => typeof id === "string" && id.trim().length > 0 && id.length <= 100
    )
  ) {
    throw new CollectionAssetRequestError(
      `collectionAssetIds must contain 1 to ${maximum} collection asset ids`
    );
  }
  return [...new Set(value)];
}

export async function findCollectionAsset(
  id: string
): Promise<CollectionAssetRecord | null> {
  const records = await readWorkspaceFeatureRecords<CollectionFeatureRecord>(
    "collections"
  );
  const asset = records.find(
    (record): record is CollectionAssetRecord =>
      record.id === id && isCollectionAssetRecord(record)
  );
  if (!asset || !isStoragePathUnder(asset.localPath, ["collection-assets"])) {
    return null;
  }
  return asset;
}

export async function resolveCollectionAssetLocalPath(id: string) {
  const asset = await findCollectionAsset(id);
  if (!asset) {
    throw new CollectionAssetRequestError(`Collection image was not found: ${id}`);
  }
  return storage.ensureLocalFile(asset.localPath);
}

export async function resolveCollectionImageReferences(ids: string[]) {
  return Promise.all(
    ids.map(async (id) =>
      uploadToFalStorage(await resolveCollectionAssetLocalPath(id))
    )
  );
}
