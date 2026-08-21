import assert from "node:assert/strict";
import {
  applyRefImageJobUpdate,
  getCloneStudioViewModel,
  mergeRefImagePollUpdates,
} from "../../src/app/ugc-clone/clone-view-model";
import type { RefImageEntry, RefJobStatus } from "../../src/components/clone/types";

const generating: RefImageEntry = {
  jobId: "job-1",
  fileId: null,
  prompt: "warm light",
  cost: 0.08,
  status: "generating",
};

assert.deepEqual(
  applyRefImageJobUpdate(generating, {
    status: "completed",
    error: null,
    estimatedCost: 0.11,
    outputs: [{ id: "file-1" }],
  }),
  {
    jobId: "job-1",
    fileId: "file-1",
    prompt: "warm light",
    cost: 0.11,
    status: "completed",
  }
);

assert.deepEqual(
  applyRefImageJobUpdate(generating, {
    status: "failed",
    error: "boom",
    estimatedCost: 0,
    outputs: [],
  }),
  {
    ...generating,
    status: "failed",
    error: "boom",
  }
);

const queued: RefJobStatus = {
  status: "queued",
  error: null,
  estimatedCost: 0,
  outputs: [],
};
assert.equal(applyRefImageJobUpdate(generating, queued), generating);

const updates: PromiseSettledResult<{ jobId: string; job: RefJobStatus }>[] = [
  {
    status: "fulfilled",
    value: {
      jobId: "job-1",
      job: {
        status: "completed",
        error: null,
        estimatedCost: 0.11,
        outputs: [{ id: "file-1" }],
      },
    },
  },
];
const merged = mergeRefImagePollUpdates([generating], updates);
assert.equal(merged[0]?.fileId, "file-1");
const prev = [generating];
assert.equal(mergeRefImagePollUpdates(prev, []), prev);

const empty = getCloneStudioViewModel({
  videoInfo: null,
  originalVideoInfo: null,
  sourceToolsOpen: false,
  avatarId: null,
  identityPack: null,
  refImages: [],
  selectedRefIndex: 0,
  selectedSavedReferenceId: null,
  savedReferences: [],
  selectedCollectionAssetId: null,
  isSubmitting: false,
  selectedModelDef: undefined,
});
assert.equal(empty.sourceReady, false);
assert.equal(empty.nextAction.label, "Add source");
assert.equal(empty.sourceDetail, "Paste a TikTok URL or choose a saved source.");
assert.equal(empty.trimDetail, "Choose a source before trimming.");
assert.equal(empty.identityDetail, "Choose the identity for this clone.");
assert.equal(empty.referenceDetail, "Generate or choose a reference image.");
