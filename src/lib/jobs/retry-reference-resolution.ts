import {
  parseReferenceFileIds,
  resolveGeneratedImageReferences,
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
};

const defaultResolvers: RetryReferenceResolvers = {
  resolveGenerated: resolveGeneratedImageReferences,
  resolveCollection: resolveCollectionImageReferences,
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
  options: { supportsCollectionReference: boolean },
  resolveCollection: RetryReferenceResolvers["resolveCollection"] =
    resolveCollectionImageReferences
) {
  const collectionAssetIds = parseCollectionAssetIds(
    input.collectionAssetIds,
    1
  );
  if (
    collectionAssetIds.length > 0 &&
    !options.supportsCollectionReference
  ) {
    throw new CollectionAssetRequestError(
      "This model does not support a collection image reference"
    );
  }
  const [executionUrl] = await resolveCollection(collectionAssetIds);
  return { collectionAssetIds, executionUrl };
}
