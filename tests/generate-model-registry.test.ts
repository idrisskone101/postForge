import assert from "node:assert/strict";
import {
  GPT_IMAGE_2_PORTRAIT_9_16,
  calculateEstimatedCost,
  getAllModels,
  getModel,
  mapAspectRatioToFalFormat,
} from "../src/lib/ai/models";
import { MODEL_REGISTRY } from "../src/lib/ai/models";

const models = getAllModels();

assert.ok(models.length >= 13, `expected the full registry, got ${models.length}`);

for (const [id, definition] of Object.entries(MODEL_REGISTRY)) {
  assert.equal(definition.id, id, `${id} must register its own id`);
  assert.ok(definition.name.trim(), `${id} needs a display name`);
  assert.ok(definition.endpoint.trim(), `${id} needs a fal endpoint`);
  assert.ok(
    definition.type === "image" || definition.type === "video",
    `${id} must be an image or video model`
  );
  assert.ok(
    ["per_image", "per_second", "per_clip"].includes(definition.pricing.unit),
    `${id} has an unknown pricing unit`
  );
  assert.ok(definition.pricing.amount > 0, `${id} needs a positive price`);
  const estimate = calculateEstimatedCost(id, {
    numImages: definition.type === "image" ? 1 : undefined,
    durationSec: definition.type === "video" ? 5 : undefined,
  });
  assert.ok(Number.isFinite(estimate) && estimate > 0, `${id} must cost something`);
}

// New model spot checks
assert.equal(getModel("veo3.1")?.pricing.amount, 0.2);
assert.equal(getModel("veo3.1")?.audioMultiplier, 2);
assert.equal(getModel("seedance-2.0")?.limits.maxDuration, 15);
assert.equal(getModel("minimax-h3")?.limits.minDuration, 5);
assert.equal(getModel("gpt-image-2")?.capabilities.textToImage, true);
assert.equal(
  getModel("gpt-image-2")?.limits.aspectRatios.includes("9:16"),
  true,
  "GPT Image 2 exposes its explicit true 9:16 size"
);
assert.deepEqual(
  mapAspectRatioToFalFormat("9:16", "gpt-image-2"),
  GPT_IMAGE_2_PORTRAIT_9_16,
);
assert.deepEqual(GPT_IMAGE_2_PORTRAIT_9_16, { width: 1152, height: 2048 });
assert.equal(getModel("seedream-5.0-pro")?.pricing.amount, 0.0675);
assert.equal(getModel("flux-2-flex")?.capabilities.textToImage, true);
assert.equal(getModel("pixverse-swap")?.capabilities.subjectSwap, true);
assert.equal(getModel("pixverse-swap")?.pricing.unit, "per_clip");
assert.equal(getModel("gemini-omni-edit")?.capabilities.subjectSwap, true);

// Audio multiplier applies to veo3 + veo3.1 only when audio is enabled
const veo31NoAudio = calculateEstimatedCost("veo3.1", { durationSec: 5 });
const veo31Audio = calculateEstimatedCost("veo3.1", {
  durationSec: 5,
  enableAudio: true,
});
assert.equal(veo31NoAudio, 1.0);
assert.equal(veo31Audio, 2.0);
assert.equal(calculateEstimatedCost("veo3", { durationSec: 5 }), 1.0);
assert.equal(
  calculateEstimatedCost("veo3", { durationSec: 5, enableAudio: true }),
  2.0
);

// Per-clip pricing doubles for sources over 5 seconds (PixVerse Swap)
assert.equal(calculateEstimatedCost("pixverse-swap", { durationSec: 5 }), 0.2);
assert.equal(calculateEstimatedCost("pixverse-swap", { durationSec: 8 }), 0.4);

// Model picker icon coverage: every registry id must have an icon mapping in
// the picker, otherwise the Generate tab renders a generic card.
import { readFileSync } from "node:fs";
const pickerSource = readFileSync(
  new URL("../src/components/model-picker.tsx", import.meta.url),
  "utf8"
);
// Model picker icon coverage: every generation model must have an icon mapping
// in the picker. Motion-control models (used by Clone, which has its own select)
// intentionally fall back to the generic card.
const MOTION_ONLY_MODELS = new Set([
  "kling-2.6-motion",
  "kling-3.0-motion",
  "kling-3.0-pro-motion",
]);
for (const model of models) {
  if (MOTION_ONLY_MODELS.has(model.id)) continue;
  assert.match(
    pickerSource,
    new RegExp(`["']?${model.id}["']?\\s*:`),
    `${model.id} needs a MODEL_ICON_MAP entry in model-picker.tsx`
  );
}

console.log("model registry tests passed");
