import {
  parseReferenceFileIds,
  resolveGeneratedImageReferences,
  parseSingleVideoReferenceFileId,
  resolveVideoReferenceImage,
} from "@/lib/ai/generated-file-references";
import {
  CollectionAssetRequestError,
  parseCollectionAssetIds,
  resolveCollectionImageReferences,
} from "@/lib/collection-assets-server";
import { parsePersistedHttpUrls } from "@/lib/jobs/retry-inputs";

type RetryReferenceResolvers = {
  resolveGenerated: (ids: string[]) => Promise<string[]>;
  resolveCollection: (ids: string[]) => Promise<string[]>;
  resolveVideoReference: (id: string) => Promise<string>;
};

const defaultResolvers: RetryReferenceResolvers = {
  resolveGenerated: resolveGeneratedImageReferences,
  resolveCollection: resolveCollectionImageReferences,
  resolveVideoReference: resolveVideoReferenceImage,
};

export async function resolveImageRetryReferences(
  input: Record<string, unknown>,
  options: {
    maximumReferences: number;
    supportsReferences: boolean;
  },
  resolvers: RetryReferenceResolvers = defaultResolvers
) {
  const referenceFileIds = parseReferenceFileIds(input.referenceFileIds);
  const collectionAssetIds = parseCollectionAssetIds(input.collectionAssetIds);
  const referenceCount = referenceFileIds.length + collectionAssetIds.length;

  if (referenceCount > options.maximumReferences) {
    throw new CollectionAssetRequestError(
      `This model accepts up to ${options.maximumReferences} reference images`
    );
  }
  if (referenceCount > 0 && !options.supportsReferences) {
    throw new CollectionAssetRequestError(
      "This model does not support reference-image editing"
    );
  }

  const [generatedUrls, collectionUrls] = await Promise.all([
    resolvers.resolveGenerated(referenceFileIds),
    resolvers.resolveCollection(collectionAssetIds),
  ]);
  const hasServerOwnedReferences = referenceCount > 0;
  const remoteUrls = hasServerOwnedReferences
    ? []
    : parsePersistedHttpUrls(input.referenceImageUrls ?? input.imageUrls);

  return {
    referenceFileIds,
    collectionAssetIds,
    executionUrls: [...generatedUrls, ...collectionUrls, ...remoteUrls],
    persistedRemoteUrls: remoteUrls,
    hasServerOwnedReferences,
  };
}

export async function resolveVideoRetryReference(
  input: Record<string, unknown>,
  options: {
    supportsCollectionReference: boolean;
    supportsVideoReference: boolean;
  },
  resolvers: Pick<
    RetryReferenceResolvers,
    "resolveCollection" | "resolveVideoReference"
  > = defaultResolvers
) {
  const collectionAssetIds = parseCollectionAssetIds(
    input.collectionAssetIds,
    1
  );
  const referenceFileId = parseSingleVideoReferenceFileId(input.referenceFileId);
  if (
    collectionAssetIds.length > 0 &&
    !options.supportsCollectionReference
  ) {
    throw new CollectionAssetRequestError(
      "This model does not support a collection image reference"
    );
  }
  if (referenceFileId && !options.supportsVideoReference) {
    throw new CollectionAssetRequestError(
      "This model does not support video seed references"
    );
  }
  if (referenceFileId && collectionAssetIds.length > 0) {
    throw new CollectionAssetRequestError(
      "A video seed reference cannot be combined with a visual collection reference. Choose one."
    );
  }
  const [collectionUrl, videoReferenceUrl] = await Promise.all([
    collectionAssetIds.length > 0
      ? resolvers.resolveCollection(collectionAssetIds)
      : Promise.resolve([]),
    referenceFileId ? resolvers.resolveVideoReference(referenceFileId) : Promise.resolve(undefined),
  ]);
  return {
    collectionAssetIds,
    referenceFileId,
    executionUrl: collectionUrl[0] ?? videoReferenceUrl,
  };
}
