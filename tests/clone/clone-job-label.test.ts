import assert from "node:assert/strict";
import { cloneJobLabel } from "@/components/clone/clone-job-label";
import { cloneSourceTitle } from "@/components/clone/clone-source-title";

const withSource = cloneJobLabel({
  id: "4151d490-b24a-4275-8bd3-d5e43833e5de",
  model: "kling-3.0-motion",
  input: {
    identityName: "Maya",
    sourceVideo: { label: "@creator.handle - 7624199102087171350" },
  },
});
assert.equal(withSource.source, "@creator.handle");
assert.equal(withSource.sourceId, "\u2026171350");
assert.equal(withSource.sub, "Maya · Kling 3.0 Motion Control");

const snapshotOnly = cloneJobLabel({
  id: "da895baf-b4dd-4eb4-9007-0a7413ca9fc5",
  model: "kling-3.0-motion",
  input: { sourceVideoSnapshot: { label: " @other - 1 " } },
});
assert.equal(snapshotOnly.source, "@other - 1");
assert.equal(snapshotOnly.sourceId, null);
assert.equal(snapshotOnly.sub, "Kling 3.0 Motion Control");

const bare = cloneJobLabel({
  id: "853f1f43-1017-4561-a463-d8f9b419b28d",
  model: "not-in-registry",
  input: null,
});
assert.equal(bare.source, null);
assert.equal(bare.sourceId, null);
assert.equal(bare.shortId, "853f1f43");
assert.equal(bare.sub, "not-in-registry");

assert.deepEqual(cloneSourceTitle("@clau.cycletips - 7624199102087171350"), {
  title: "@clau.cycletips",
  shortId: "\u2026171350",
});
assert.deepEqual(cloneSourceTitle("7624199102087171350"), {
  title: "TikTok video",
  shortId: "\u2026171350",
});
assert.deepEqual(cloneSourceTitle("Morning routine b-roll"), {
  title: "Morning routine b-roll",
  shortId: null,
});
assert.equal(cloneSourceTitle("  "), null);
assert.equal(cloneSourceTitle(undefined), null);

console.log("clone job label tests passed");
