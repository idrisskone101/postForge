export type CollectionRecord = {
  id: string;
  kind: "collection";
  name: string;
  assetIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CollectionAssetRecord = {
  id: string;
  kind: "asset";
  name: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  localPath: string;
  createdAt: string;
};

export type CollectionFeatureRecord = CollectionRecord | CollectionAssetRecord;

export function isCollectionRecord(value: unknown): value is CollectionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CollectionRecord>;
  return (
    record.kind === "collection" &&
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.name === "string" &&
    Array.isArray(record.assetIds) &&
    record.assetIds.every((assetId) => typeof assetId === "string") &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string"
  );
}

export function isCollectionAssetRecord(value: unknown): value is CollectionAssetRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CollectionAssetRecord>;
  return (
    record.kind === "asset" &&
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.name === "string" &&
    typeof record.filename === "string" &&
    typeof record.localPath === "string" &&
    typeof record.mimeType === "string" &&
    record.mimeType.startsWith("image/") &&
    typeof record.fileSizeBytes === "number" &&
    Number.isFinite(record.fileSizeBytes) &&
    record.fileSizeBytes >= 0 &&
    typeof record.createdAt === "string"
  );
}

export function removeCollectionAssetReferences(
  records: readonly CollectionFeatureRecord[],
  assetId: string,
  updatedAt: string
): CollectionFeatureRecord[] {
  return records
    .filter((record) => record.id !== assetId)
    .map((record) =>
      isCollectionRecord(record) && record.assetIds.includes(assetId)
        ? {
            ...record,
            assetIds: record.assetIds.filter((candidate) => candidate !== assetId),
            updatedAt,
          }
        : record
    );
}
