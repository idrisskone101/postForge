import assert from "node:assert/strict";

import {
  getClonePrimaryAction,
} from "../../src/lib/ugc/clone-workflow";
import {
  describeGenerateIdentityStatus,
  generationErrorMessage,
} from "../../src/lib/generation-workflow";

assert.equal(
  getClonePrimaryAction({
    sourceReady: false,
    trimReady: false,
    identityReady: false,
    referenceReady: false,
    canGenerate: false,
    usesSavedReference: false,
  }).label,
  "Add source",
);

assert.equal(
  generationErrorMessage(new Error("provider unavailable"), "fallback"),
  "provider unavailable",
);
assert.equal(generationErrorMessage(null, "fallback"), "fallback");

assert.equal(
  describeGenerateIdentityStatus(null).label,
  "No prepared identity pack yet. The original avatar image will be used.",
);
assert.equal(
  describeGenerateIdentityStatus({
    id: "pack-1",
    avatarId: "avatar-1",
    status: "completed",
    error: null,
    images: [{ id: "img-1" }, { id: "img-2" }],
  }).label,
  "2 identity references are ready.",
);

console.log("clone and generate workflow tests passed");
