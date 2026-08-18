import assert from "node:assert/strict";

import type {
  CollectionAssetRecord,
  CollectionRecord,
} from "../../src/lib/collections";
import {
  collectionImagesFor,
  platformCollectionAssetIdFromUrl,
  platformCollectionAssetUrl,
  summarizePlatformCollections,
} from "../../src/lib/collections-read-model";

const collection: CollectionRecord = {
  id: "col-1",
  kind: "collection",
  name: "Warm references",
  assetIds: ["asset-2", "asset-1"],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const assets: CollectionAssetRecord[] = [
  {
    id: "asset-1",
    kind: "asset",
    name: "one",
    filename: "one.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 12,
    localPath: "/tmp/one.jpg",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "asset-2",
    kind: "asset",
    name: "two",
    filename: "two.jpg",
    mimeType: "image/jpeg",
    fileSizeBytes: 14,
    localPath: "/tmp/two.jpg",
    createdAt: "2026-08-01T00:00:00.000Z",
  },
];

assert.equal(platformCollectionAssetUrl("asset 1"), "/api/collection-assets/asset%201");
assert.equal(
  platformCollectionAssetIdFromUrl("/api/collection-assets/asset%201"),
  "asset 1",
);
assert.equal(platformCollectionAssetIdFromUrl("/api/jobs/job-1"), null);

assert.deepEqual(collectionImagesFor(collection, assets), [
  {
    id: "asset-2",
    url: "/api/collection-assets/asset-2",
    localPath: "/tmp/two.jpg",
  },
  {
    id: "asset-1",
    url: "/api/collection-assets/asset-1",
    localPath: "/tmp/one.jpg",
  },
]);

assert.deepEqual(summarizePlatformCollections([collection, ...assets]), [
  {
    id: "col-1",
    name: "Warm references",
    imageCount: 2,
    imageUrls: [
      "/api/collection-assets/asset-2",
      "/api/collection-assets/asset-1",
    ],
  },
]);

console.log("collection read-model tests passed");
