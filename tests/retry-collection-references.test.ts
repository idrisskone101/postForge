import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCloneRetryRequest } from "../src/lib/jobs/retry-inputs";
import {
  resolveImageRetryReferences,
  resolveVideoRetryReference,
} from "../src/lib/jobs/retry-reference-resolution";

const cloneRequest = buildCloneRetryRequest(
  {
    tiktokSourceId: "source-1",
    tiktokVideoPath: "ugc-clone-sources/source-1.mp4",
    avatarId: "avatar-1",
    collectionAssetId: "collection-asset-clone",
    modelId: "kling-3.0-motion",
  },
  "kling-3.0-motion"
);
assert.equal(cloneRequest?.collectionAssetId, "collection-asset-clone");
assert.equal(cloneRequest?.referenceImageFileId, undefined);
assert.equal(
  buildCloneRetryRequest(
    {
      tiktokSourceId: "source-1",
      tiktokVideoPath: "ugc-clone-sources/source-1.mp4",
      avatarId: "avatar-1",
      collectionAssetId: "collection-asset-clone",
      savedReferenceId: "saved-reference-1",
    },
    "kling-3.0-motion"
  ),
  null,
  "clone retries must reject conflicting persisted reference sources"
);

void (async () => {
  const imageResolutionCalls: string[][] = [];
  const imageReferences = await resolveImageRetryReferences(
    {
      collectionAssetIds: ["collection-image-1", "collection-image-2"],
      referenceImageUrls: ["https://untrusted.example/client-reference.jpg"],
    },
    { maximumReferences: 14, supportsReferences: true },
    {
      resolveGenerated: async (ids) => {
        assert.deepEqual(ids, []);
        return [];
      },
      resolveCollection: async (ids) => {
        imageResolutionCalls.push(ids);
        return ids.map((id) => `https://provider.test/resolved/${id}`);
      },
    }
  );
  assert.deepEqual(imageResolutionCalls, [
    ["collection-image-1", "collection-image-2"],
  ]);
  assert.deepEqual(imageReferences.collectionAssetIds, [
    "collection-image-1",
    "collection-image-2",
  ]);
  assert.deepEqual(imageReferences.executionUrls, [
    "https://provider.test/resolved/collection-image-1",
    "https://provider.test/resolved/collection-image-2",
  ]);
  assert.deepEqual(
    imageReferences.persistedRemoteUrls,
    [],
    "collection-backed image retries must ignore persisted client URLs"
  );

  const videoReferences = await resolveVideoRetryReference(
    { collectionAssetIds: ["collection-video-1"] },
    { supportsCollectionReference: true },
    async (ids) => {
      assert.deepEqual(ids, ["collection-video-1"]);
      return ["https://provider.test/resolved/collection-video-1"];
    }
  );
  assert.deepEqual(videoReferences.collectionAssetIds, ["collection-video-1"]);
  assert.equal(
    videoReferences.executionUrl,
    "https://provider.test/resolved/collection-video-1"
  );

  await assert.rejects(
    () =>
      resolveVideoRetryReference(
        { collectionAssetIds: ["collection-video-1", "collection-video-2"] },
        { supportsCollectionReference: true },
        async () => []
      ),
    /collectionAssetIds must contain 1 to 1/
  );

  const routeSource = readFileSync(
    new URL("../src/app/api/jobs/[id]/retry/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(routeSource, /resolveCollectionAssetLocalPath\(cloneRequest\.collectionAssetId\)/);
  assert.match(routeSource, /resolveImageRetryReferences\(input/);
  assert.match(routeSource, /imageUrls: retryReferences\.executionUrls/);
  assert.match(routeSource, /collectionAssetIds: retryReferences\.collectionAssetIds/);
  assert.match(routeSource, /imageUrls: undefined/);
  assert.match(routeSource, /resolveVideoRetryReference\(input/);
  assert.match(routeSource, /inputImageUrl:\s*retryReference\.executionUrl/);
  assert.match(routeSource, /collectionAssetIds: retryReference\.collectionAssetIds/);

  console.log("collection-backed retry tests passed");
})();
