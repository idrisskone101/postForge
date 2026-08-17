import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCharacterVideoProviderRequest,
  submitDurableCharacterIntent,
  type DurableCharacterSubmissionDependencies,
} from "../src/lib/ai/generate-character-video";
import { getModel } from "../src/lib/ai/models";

const identityElement = {
  frontal_image_url: "https://example.com/front.jpg",
  reference_image_urls: [
    "https://example.com/left.jpg",
    "https://example.com/right.jpg",
  ],
};
const shared = {
  prompt: "The creator demonstrates a skincare bottle in a bright bathroom.",
  anchorUrl: "https://example.com/anchor.jpg",
  identityUrls: [
    "https://example.com/front.jpg",
    "https://example.com/left.jpg",
    "https://example.com/right.jpg",
  ],
  duration: 8,
  aspectRatio: "9:16",
  enableAudio: true,
};

const kling = buildCharacterVideoProviderRequest({
  ...shared,
  strategy: "kling-element",
  identityElement,
});
assert.equal(kling.endpoint, "fal-ai/kling-video/v3/standard/image-to-video");
assert.equal(kling.payload.start_image_url, shared.anchorUrl);
assert.equal(kling.payload.generate_audio, true);
assert.deepEqual(kling.payload.elements, [identityElement]);
assert.match(String(kling.payload.prompt), /@Element1/);

const seedance = buildCharacterVideoProviderRequest({
  ...shared,
  strategy: "seedance-images",
});
assert.equal(seedance.endpoint, "bytedance/seedance-2.0/reference-to-video");
assert.deepEqual(seedance.payload.image_urls, [shared.anchorUrl, ...shared.identityUrls]);
assert.equal(seedance.payload.duration, "8");
assert.match(String(seedance.payload.prompt), /@Image1/);
assert.match(String(seedance.payload.prompt), /@Image4/);

const gemini = buildCharacterVideoProviderRequest({
  ...shared,
  strategy: "gemini-images",
});
assert.equal(gemini.endpoint, "google/gemini-omni-flash/reference-to-video");
assert.deepEqual(gemini.payload.image_urls, [shared.anchorUrl, ...shared.identityUrls]);
assert.equal(gemini.payload.duration, 8);
assert.match(String(gemini.payload.prompt), /<IMAGE_REF_0>/);
assert.match(String(gemini.payload.prompt), /<IMAGE_REF_3>/);

assert.equal(
  getModel("kling-3.0-i2v")?.capabilities.characterReference,
  "kling-element"
);
assert.equal(
  getModel("seedance-2.0")?.capabilities.characterReference,
  "seedance-images"
);
assert.equal(
  getModel("gemini-omni-flash")?.capabilities.characterReference,
  "gemini-images"
);
assert.equal(getModel("kling-3.0-i2v")?.pricing.amount, 0.084);

function durableDependencies(overrides: {
  claimed?: boolean;
  requestId?: string;
  submitError?: Error;
  persisted?: boolean;
}) {
  const calls = {
    claims: 0,
    submits: 0,
    persisted: 0,
    unknown: 0,
    pollers: 0,
  };
  const dependencies: DurableCharacterSubmissionDependencies = {
    createLeaseOwner: () => "test-lease",
    now: () => new Date("2026-08-09T12:00:00.000Z"),
    claim: async () => {
      calls.claims += 1;
      return overrides.claimed ?? true;
    },
    readIntent: async () => ({ endpoint: "fal/test", payload: { prompt: "test" } }),
    submit: async () => {
      calls.submits += 1;
      if (overrides.submitError) throw overrides.submitError;
      return { request_id: overrides.requestId ?? "fal-request-1" };
    },
    markSubmitted: async () => {
      calls.persisted += 1;
      return overrides.persisted ?? true;
    },
    markUnknown: async () => {
      calls.unknown += 1;
      return true;
    },
    startPoller: () => {
      calls.pollers += 1;
    },
  };
  return { calls, dependencies };
}

(async () => {
const successfulSubmission = durableDependencies({});
assert.equal(
  await submitDurableCharacterIntent("job-success", {
    submittingStage: "submitting-video",
    submittedStage: "submitted",
    dependencies: successfulSubmission.dependencies,
  }),
  "submitted"
);
assert.deepEqual(successfulSubmission.calls, {
  claims: 1,
  submits: 1,
  persisted: 1,
  unknown: 0,
  pollers: 1,
});

const ambiguousSubmission = durableDependencies({
  submitError: new Error("connection closed after submission"),
});
assert.equal(
  await submitDurableCharacterIntent("job-ambiguous", {
    submittingStage: "submitting-anchor",
    submittedStage: "submitted",
    dependencies: ambiguousSubmission.dependencies,
  }),
  "submission-unknown"
);
assert.equal(ambiguousSubmission.calls.submits, 1);
assert.equal(ambiguousSubmission.calls.unknown, 1);
assert.equal(ambiguousSubmission.calls.pollers, 0);

const lostPersistence = durableDependencies({ persisted: false });
assert.equal(
  await submitDurableCharacterIntent("job-persist-failed", {
    submittingStage: "submitting-video",
    submittedStage: "submitted",
    dependencies: lostPersistence.dependencies,
  }),
  "submission-unknown"
);
assert.equal(lostPersistence.calls.submits, 1);
assert.equal(lostPersistence.calls.unknown, 1);

const unclaimedSubmission = durableDependencies({ claimed: false });
assert.equal(
  await submitDurableCharacterIntent("job-unclaimed", {
    submittingStage: "submitting-video",
    submittedStage: "submitted",
    dependencies: unclaimedSubmission.dependencies,
  }),
  "unclaimed"
);
assert.equal(unclaimedSubmission.calls.submits, 0);

const formSource = readFileSync(
  new URL("../src/components/generation-form.tsx", import.meta.url),
  "utf8"
);
const videoRouteSource = readFileSync(
  new URL("../src/app/api/generate/videos/route.ts", import.meta.url),
  "utf8"
);
const retryRouteSource = readFileSync(
  new URL("../src/app/api/jobs/[id]/retry/route.ts", import.meta.url),
  "utf8"
);

assert.match(formSource, /avatarId:\s*avatarId \?\? undefined/);
assert.match(formSource, /capabilities\.characterReference/);
assert.match(formSource, /identity-locked opening frame/);
assert.match(formSource, /nextAvatarId && videoReferenceFileId/);
assert.match(videoRouteSource, /generateCharacterVideo/);
assert.match(videoRouteSource, /cannot be combined with another seed reference/);
assert.match(retryRouteSource, /anchorJobId/);
assert.match(retryRouteSource, /isCharacterVideo/);
assert.match(retryRouteSource, /savedAnchorJob\?\.status === "completed"/);
assert.match(retryRouteSource, /outputs\.some\(\(output\) => output\.type === "image"\)/);

console.log("character video tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
