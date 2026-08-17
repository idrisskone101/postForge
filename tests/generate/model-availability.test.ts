import assert from "node:assert/strict";
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  getAvailableModels,
  getDefaultIntelligenceModel,
  getDefaultModel,
  getDefaultVisionIntelligenceModel,
  isModelEnabled,
  readModelAvailability,
  saveModelAvailability,
} from "../src/lib/ai/model-availability";
import { getAllModels } from "../src/lib/ai/models";
import { STORY_MODELS } from "../src/lib/ai/story-models";

async function testAvailabilityDefaults() {
  const availability = await readModelAvailability();
  assert.equal(availability.id, "model-availability");
  const registryIds = new Set(getAllModels().map((model) => model.id));
  for (const id of availability.enabledModelIds) {
    assert.ok(registryIds.has(id), `enabled id ${id} must exist in the registry`);
  }

  const imageDefault = await getDefaultModel("image");
  assert.equal(imageDefault, DEFAULT_IMAGE_MODEL);
  const videoDefault = await getDefaultModel("video");
  assert.equal(videoDefault, DEFAULT_VIDEO_MODEL);

  const intelligenceDefault = await getDefaultIntelligenceModel();
  assert.equal(intelligenceDefault.id, STORY_MODELS[0].id);
  const visionDefault = await getDefaultVisionIntelligenceModel();
  assert.ok(visionDefault, "a vision-capable intelligence fallback must exist");
  assert.equal(visionDefault.vision, true);

  const available = await getAvailableModels();
  assert.ok(available.length >= getAllModels().length - 1);
  for (const model of available) {
    assert.equal(await isModelEnabled(model.id), true);
  }
}

// This test's package script pins DATABASE_URL to an unreachable local port.
// The availability store applies writes optimistically to its in-process cache
// before persisting, so reads must reflect the new state after persistence
// fails without depending on whether a developer database happens to be live.
async function trySave(state: {
  enabledModelIds: string[];
  defaultImageModelId: string | null;
  defaultVideoModelId: string | null;
  defaultIntelligenceModelId: string | null;
}) {
  let persistenceFailed = false;
  try {
    await saveModelAvailability(state);
  } catch {
    persistenceFailed = true;
  }
  assert.equal(persistenceFailed, true, "the isolated test database must be unreachable");
}

async function testTogglePersistence() {
  const target = getAllModels().find((model) => model.type === "image");
  assert.ok(target, "registry must have an image model");

  const before = await readModelAvailability();
  assert.ok(before.enabledModelIds.includes(target.id));

  await trySave({
    enabledModelIds: before.enabledModelIds.filter((id) => id !== target.id),
    defaultImageModelId: null,
    defaultVideoModelId: null,
    defaultIntelligenceModelId: null,
  });

  const after = await readModelAvailability();
  assert.equal(after.enabledModelIds.includes(target.id), false);
  assert.equal(await isModelEnabled(target.id), false);

  const availableAfter = await getAvailableModels();
  assert.equal(availableAfter.some((model) => model.id === target.id), false);

  await trySave({
    enabledModelIds: getAllModels().map((model) => model.id),
    defaultImageModelId: DEFAULT_IMAGE_MODEL,
    defaultVideoModelId: DEFAULT_VIDEO_MODEL,
    defaultIntelligenceModelId: null,
  });
  const restored = await readModelAvailability();
  assert.equal(restored.enabledModelIds.includes(target.id), true);
}

async function testDefaultSelection() {
  const imageModels = getAllModels().filter((model) => model.type === "image");
  const customDefault = imageModels[1];
  assert.ok(customDefault);

  await trySave({
    enabledModelIds: getAllModels().map((model) => model.id),
    defaultImageModelId: customDefault.id,
    defaultVideoModelId: null,
    defaultIntelligenceModelId: null,
  });

  assert.equal(await getDefaultModel("image"), customDefault.id);

  // A disabled default must fall back to the first enabled model of that type.
  await trySave({
    enabledModelIds: getAllModels()
      .map((model) => model.id)
      .filter((id) => id !== customDefault.id),
    defaultImageModelId: customDefault.id,
    defaultVideoModelId: null,
    defaultIntelligenceModelId: null,
  });
  const fallback = await getDefaultModel("image");
  assert.notEqual(fallback, customDefault.id);
  assert.equal(await isModelEnabled(fallback), true);

  await trySave({
    enabledModelIds: getAllModels().map((model) => model.id),
    defaultImageModelId: DEFAULT_IMAGE_MODEL,
    defaultVideoModelId: DEFAULT_VIDEO_MODEL,
    defaultIntelligenceModelId: null,
  });
}

async function testIntelligenceSelection() {
  const visionModel = STORY_MODELS.find((model) => model.vision === true);
  assert.ok(visionModel, "catalog must include a vision-capable model");

  await trySave({
    enabledModelIds: getAllModels().map((model) => model.id),
    defaultImageModelId: DEFAULT_IMAGE_MODEL,
    defaultVideoModelId: DEFAULT_VIDEO_MODEL,
    defaultIntelligenceModelId: "kimi-k3",
  });
  assert.equal((await getDefaultIntelligenceModel()).id, "kimi-k3");
  // A text-only default defers image analysis to the vision fallback.
  assert.equal((await getDefaultVisionIntelligenceModel())?.vision, true);

  await trySave({
    enabledModelIds: getAllModels().map((model) => model.id),
    defaultImageModelId: DEFAULT_IMAGE_MODEL,
    defaultVideoModelId: DEFAULT_VIDEO_MODEL,
    defaultIntelligenceModelId: visionModel.id,
  });
  assert.equal((await getDefaultVisionIntelligenceModel())?.id, visionModel.id);

  await trySave({
    enabledModelIds: getAllModels().map((model) => model.id),
    defaultImageModelId: DEFAULT_IMAGE_MODEL,
    defaultVideoModelId: DEFAULT_VIDEO_MODEL,
    defaultIntelligenceModelId: null,
  });
}

testAvailabilityDefaults()
  .then(testTogglePersistence)
  .then(testDefaultSelection)
  .then(testIntelligenceSelection)
  .then(() => console.log("model availability tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
