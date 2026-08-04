export type HomeJobProductionMetadata = {
  sourceId: string | null;
  sourceDetail: string | null;
  identityId: string | null;
  referenceCount: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];
}

/**
 * Extract only persisted, server-owned production facts. Prompt wording is not
 * treated as proof that a source or identity was selected.
 */
export function getHomeJobProductionMetadata(
  inputValue: unknown
): HomeJobProductionMetadata {
  const input = asRecord(inputValue);
  const sourceVideo =
    asRecord(input?.sourceVideo) ?? asRecord(input?.sourceVideoSnapshot);
  const sourceId =
    asString(input?.tiktokSourceId) ?? asString(sourceVideo?.sourceId);
  const sourceLabel = asString(sourceVideo?.label);
  const referenceFileIds = asStringArray(input?.referenceFileIds);
  const collectionAssetIds = asStringArray(input?.collectionAssetIds);
  const singleCollectionAssetId = asString(input?.collectionAssetId);
  const referenceCount =
    referenceFileIds.length +
    collectionAssetIds.length +
    (singleCollectionAssetId ? 1 : 0);

  let sourceDetail: string | null = null;
  if (sourceLabel) {
    sourceDetail = sourceLabel;
  } else if (sourceId) {
    sourceDetail = "Source linked";
  } else if (referenceCount > 0) {
    sourceDetail = `${referenceCount} saved reference${referenceCount === 1 ? "" : "s"}`;
  } else if (asString(input?.inputImageUrl)) {
    sourceDetail = "Input image linked";
  }

  return {
    sourceId,
    sourceDetail,
    identityId: asString(input?.avatarId),
    referenceCount,
  };
}
