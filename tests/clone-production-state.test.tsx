import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CloneProductionStatePanel,
  createReferenceImageBatchEntries,
  getClonePrimaryAction,
} from "../src/components/ugc-clone-form";

const emptyState = renderToStaticMarkup(
  <CloneProductionStatePanel
    sourceReady={false}
    trimReady={false}
    identityReady={false}
    referenceReady={false}
    canGenerate={false}
    nextAction={getClonePrimaryAction({
      sourceReady: false,
      identityReady: false,
      referenceReady: false,
      canGenerate: false,
      usesSavedReference: false,
    })}
  />
);

assert.match(emptyState, /Production State/);
assert.match(emptyState, /Source/);
assert.match(emptyState, /Trim/);
assert.match(emptyState, /Identity/);
assert.match(emptyState, /Reference/);
assert.match(emptyState, /Generate readiness/);
assert.match(emptyState, /Add source to continue/);

assert.equal(
  getClonePrimaryAction({
    sourceReady: true,
    identityReady: false,
    referenceReady: false,
    canGenerate: false,
    usesSavedReference: false,
  }).label,
  "Select identity"
);

assert.equal(
  getClonePrimaryAction({
    sourceReady: true,
    identityReady: true,
    referenceReady: true,
    canGenerate: true,
    usesSavedReference: true,
  }).label,
  "Generate clone"
);

void (async () => {
  const referenceRequests: { path: string; body: unknown }[] = [];
  const batchEntries = await createReferenceImageBatchEntries({
    batchSize: 3,
    videoInfo: {
      id: "source-123",
      localPath: "/tmp/source.mp4",
    },
    avatarId: "avatar-456",
    prompt: "warm window light",
    imageModel: "nano-banana-2",
    unitCost: 0.08,
    post: async <T,>(path: string, body: unknown): Promise<T> => {
      referenceRequests.push({ path, body });
      return {
        id: `job-${referenceRequests.length}`,
        estimatedCost: 0.08,
      } as T;
    },
  });

  assert.equal(referenceRequests.length, 3);
  assert.deepEqual(
    referenceRequests.map((request) => request.path),
    [
      "/api/ugc-clone/reference-image",
      "/api/ugc-clone/reference-image",
      "/api/ugc-clone/reference-image",
    ]
  );
  assert.deepEqual(referenceRequests[0].body, {
    tiktokVideoPath: "/tmp/source.mp4",
    tiktokSourceId: "source-123",
    avatarId: "avatar-456",
    prompt: "warm window light",
    imageModel: "nano-banana-2",
  });
  assert.deepEqual(
    batchEntries.map((entry) => ({
      jobId: entry.jobId,
      prompt: entry.prompt,
      cost: entry.cost,
      status: entry.status,
    })),
    [
      { jobId: "job-1", prompt: "warm window light", cost: 0.08, status: "generating" },
      { jobId: "job-2", prompt: "warm window light", cost: 0.08, status: "generating" },
      { jobId: "job-3", prompt: "warm window light", cost: 0.08, status: "generating" },
    ]
  );
})();
