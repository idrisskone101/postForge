import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CloneSourceEmptyState,
  CloneIdentityStatusPanel,
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
assert.match(emptyState, /Add source/);
assert.match(emptyState, /data-workspace-state="empty"/);

const sourcePlaceholder = renderToStaticMarkup(<CloneSourceEmptyState />);
assert.match(sourcePlaceholder, /data-workspace-state="empty"/);
assert.match(sourcePlaceholder, /Add source/);
assert.match(sourcePlaceholder, /Your selected clip appears here/);

assert.equal(
  getClonePrimaryAction({
    sourceReady: true,
    identityReady: false,
    referenceReady: false,
    canGenerate: false,
    usesSavedReference: false,
  }).label,
  "Choose identity"
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

const failedIdentityStatus = renderToStaticMarkup(
  <CloneIdentityStatusPanel
    avatarReady
    identityPack={{
      id: "pack-failed",
      avatarId: "avatar-imported",
      status: "failed",
      imageModel: "nano-banana-2",
      error: "Identity generation failed",
      createdAt: "2026-06-14T12:00:00.000Z",
      updatedAt: "2026-06-14T12:00:00.000Z",
      images: [],
    }}
    isStartingIdentityPack={false}
    identityPackError={null}
    onRetry={() => {}}
  />
);

assert.match(failedIdentityStatus, /Reference prep failed/);
assert.match(failedIdentityStatus, /original avatar is still usable/i);
assert.match(failedIdentityStatus, /Retry identity prep/);

const preparingIdentityStatus = renderToStaticMarkup(
  <CloneIdentityStatusPanel
    avatarReady
    identityPack={{
      id: "pack-processing",
      avatarId: "avatar-imported",
      status: "processing",
      imageModel: "nano-banana-2",
      error: null,
      createdAt: "2026-06-14T12:00:00.000Z",
      updatedAt: "2026-06-14T12:00:00.000Z",
      images: [],
    }}
    isStartingIdentityPack={false}
    identityPackError={null}
    onRetry={() => {}}
  />
);

assert.match(preparingIdentityStatus, /Preparing identity references/);
assert.match(preparingIdentityStatus, /original avatar remains usable/i);

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
