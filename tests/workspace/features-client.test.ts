import assert from "node:assert/strict";
import {
  fetchWorkspaceFeature,
  removeWorkspaceFeature,
  saveWorkspaceFeature,
} from "../../src/lib/workspace-features-client";
import {
  removeCollectionAssetReferences,
  type CollectionFeatureRecord,
} from "../../src/lib/collections";

type ExampleRecord = {
  id: string;
  name: string;
};

type FetchCall = {
  input: string | URL | Request;
  init?: RequestInit;
};

const originalFetch = globalThis.fetch;
const calls: FetchCall[] = [];

const collectionRecords: CollectionFeatureRecord[] = [
  {
    id: "asset-shared",
    kind: "asset",
    name: "Shared portrait",
    filename: "shared.png",
    mimeType: "image/png",
    fileSizeBytes: 512,
    localPath: "collection-assets/shared.png",
    createdAt: "2026-08-03T12:00:00.000Z",
  },
  {
    id: "collection-a",
    kind: "collection",
    name: "A",
    assetIds: ["asset-shared", "asset-a"],
    createdAt: "2026-08-03T12:00:00.000Z",
    updatedAt: "2026-08-03T12:00:00.000Z",
  },
  {
    id: "collection-b",
    kind: "collection",
    name: "B",
    assetIds: ["asset-b", "asset-shared"],
    createdAt: "2026-08-03T12:00:00.000Z",
    updatedAt: "2026-08-03T12:00:00.000Z",
  },
];

const cleanedCollections = removeCollectionAssetReferences(
  collectionRecords,
  "asset-shared",
  "2026-08-03T13:00:00.000Z"
);
assert.equal(cleanedCollections.some((record) => record.id === "asset-shared"), false);
assert.equal(
  cleanedCollections.some(
    (record) => "assetIds" in record && record.assetIds.includes("asset-shared")
  ),
  false
);
assert.deepEqual(
  cleanedCollections
    .filter((record) => "assetIds" in record)
    .map((record) => record.updatedAt),
  ["2026-08-03T13:00:00.000Z", "2026-08-03T13:00:00.000Z"]
);

async function run() {
  try {
    globalThis.fetch = async (input, init) => {
      calls.push({ input, init });
      return Response.json({ records: [{ id: "character-1", name: "Maya" }] });
    };

    const fetched = await fetchWorkspaceFeature<ExampleRecord>("characters");
    assert.deepEqual(fetched, {
      records: [{ id: "character-1", name: "Maya" }],
    });
    assert.equal(calls[0]?.input, "/api/workspace-features/characters");
    assert.deepEqual(calls[0]?.init, { cache: "no-store" });

    const record = { id: "automation-1", name: "Story loop" };
    const saved = await saveWorkspaceFeature("automations", record);
    assert.deepEqual(saved, {
      records: [{ id: "character-1", name: "Maya" }],
    });
    assert.equal(calls[1]?.input, "/api/workspace-features/automations");
    assert.equal(calls[1]?.init?.method, "PUT");
    assert.deepEqual(calls[1]?.init?.headers, {
      "Content-Type": "application/json",
    });
    assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), { record });

    const removed = await removeWorkspaceFeature<ExampleRecord>(
      "collections",
      "collection / hero"
    );
    assert.deepEqual(removed, {
      records: [{ id: "character-1", name: "Maya" }],
    });
    assert.equal(
      calls[2]?.input,
      "/api/workspace-features/collections?id=collection%20%2F%20hero"
    );
    assert.deepEqual(calls[2]?.init, { method: "DELETE" });

    globalThis.fetch = async () =>
      Response.json(
        { error: "Unknown workspace feature" },
        { status: 404, statusText: "Not Found" }
      );
    await assert.rejects(
      () => fetchWorkspaceFeature<ExampleRecord>("unknown"),
      /Unknown workspace feature/
    );

    globalThis.fetch = async () =>
      Response.json(
        { message: "Record could not be saved" },
        { status: 400, statusText: "Bad Request" }
      );
    await assert.rejects(
      () => saveWorkspaceFeature("characters", { id: "x", name: "X" }),
      /Record could not be saved/
    );

    globalThis.fetch = async () =>
      new Response("upstream unavailable", {
        status: 503,
        statusText: "Service Unavailable",
      });
    await assert.rejects(
      () => removeWorkspaceFeature<ExampleRecord>("characters", "x"),
      /Service Unavailable/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
