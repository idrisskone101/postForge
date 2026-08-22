import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getClonePrimaryAction,
} from "../../src/lib/ugc/clone-workflow";
import {
  describeGenerateIdentityStatus,
} from "../../src/lib/generation-workflow";
import { userErrorMessage } from "../../src/lib/user-error-message";

function countUseEffects(source: string) {
  return (source.match(/useEffect\(/g) ?? []).length;
}

const cloneFormHookSource = readFileSync(
  new URL("../../src/app/ugc-clone/use-clone-form.ts", import.meta.url),
  "utf8"
);
const cloneIdentityHookSource = readFileSync(
  new URL("../../src/app/ugc-clone/use-clone-identity.ts", import.meta.url),
  "utf8"
);
const cloneRefImagesHookSource = readFileSync(
  new URL("../../src/app/ugc-clone/use-clone-ref-images.ts", import.meta.url),
  "utf8"
);

assert.equal(countUseEffects(cloneFormHookSource), 2);
assert.match(cloneFormHookSource, /prevSourceIdParam/);
assert.doesNotMatch(
  cloneFormHookSource,
  /useEffect\(\(\) => \{[\s\S]*sourceIdParam[\s\S]*setPendingSourceId/
);
assert.equal(countUseEffects(cloneIdentityHookSource), 2);
assert.match(cloneIdentityHookSource, /prevAvatarId/);
assert.equal(countUseEffects(cloneRefImagesHookSource), 2);
assert.doesNotMatch(
  cloneRefImagesHookSource,
  /useEffect\(\(\) => \{[\s\S]*refImagesRef\.current = refImages/
);

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
  userErrorMessage(new Error("provider unavailable"), "fallback"),
  "provider unavailable",
);
assert.equal(userErrorMessage(null, "fallback"), "fallback");

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
