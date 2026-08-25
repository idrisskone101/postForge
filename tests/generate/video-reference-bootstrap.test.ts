import assert from "node:assert/strict";
import { getAllModels } from "../../src/lib/ai/models";
import { resolveGenerationFormInitialState } from "../../src/app/(app)/generate/use-generation-form-helpers";

const models = getAllModels();
const imageModel = models.find((model) => model.type === "image") ?? models[0];
const continuityModel =
  models.find(
    (model) =>
      model.type === "video" &&
      model.capabilities.videoToVideo === true &&
      model.capabilities.subjectSwap !== true
  ) ?? models[0];

const params = (query: Record<string, string>) => ({
  get: (key: string) => query[key] ?? null,
});

const plain = resolveGenerationFormInitialState(
  models,
  params({ model: imageModel.id, prompt: "kitchen demo" })
);
assert.equal(plain.selectedModelId, imageModel.id);
assert.equal(plain.prompt, "kitchen demo");
assert.equal(plain.videoReferenceFileId, null);
assert.equal(plain.submitError, null);

const deepLink = resolveGenerationFormInitialState(
  models,
  params({
    model: imageModel.id,
    referenceFileId: "output-1",
  })
);
assert.equal(deepLink.selectedModelId, continuityModel.id);
assert.equal(deepLink.videoReferenceFileId, "output-1");
assert.equal(deepLink.submitError, null);
assert.equal(deepLink.aspectRatio, continuityModel.defaults.aspectRatio);

const continuityReady = resolveGenerationFormInitialState(
  models,
  params({
    model: continuityModel.id,
    referenceFileId: "output-1",
  })
);
assert.equal(continuityReady.selectedModelId, continuityModel.id);
assert.equal(continuityReady.videoReferenceFileId, "output-1");
assert.equal(continuityReady.submitError, null);

console.log("video-reference-bootstrap.test.ts passed");
