import { renderToStaticMarkup } from "react-dom/server";
import { ModelPicker } from "../../src/components/model-picker";
import assert from "node:assert/strict";
import {
  GPT_IMAGE_2_PORTRAIT_9_16,
  calculateEstimatedCost,
  getAllModels,
  getModel,
  mapAspectRatioToFalFormat,
} from "../../src/lib/ai/models";
import { MODEL_REGISTRY } from "../../src/lib/ai/models";

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
assert.equal(getModel("gpt-image-2.5")?.name, "GPT Image 2.5");
assert.equal(
  getModel("gpt-image-2.5")?.endpoint,
  "openai/gpt-image-2.5/flare/text-to-image",
);
assert.equal(getModel("gpt-image-2.5")?.pricing.amount, 0.055);
assert.deepEqual(
  mapAspectRatioToFalFormat("9:16", "gpt-image-2.5"),
  GPT_IMAGE_2_PORTRAIT_9_16,
);
assert.equal(
  getModel("gpt-image-2.5-sunburst")?.endpoint,
  "openai/gpt-image-2.5/sunburst/text-to-image",
);
assert.equal(getModel("gpt-image-2.5-sunburst")?.pricing.amount, 0.055);
assert.deepEqual(
  mapAspectRatioToFalFormat("1:1", "gpt-image-2.5-sunburst"),
  "square_hd",
);
assert.equal(getModel("gpt-image-2.6")?.name, "GPT Image 2.6");
assert.equal(
  getModel("gpt-image-2.6")?.endpoint,
  "openai/gpt-image-2.6/flare/text-to-image",
);
assert.deepEqual(
  mapAspectRatioToFalFormat("9:16", "gpt-image-2.6"),
  GPT_IMAGE_2_PORTRAIT_9_16,
);
assert.equal(
  getModel("gpt-image-2.6-sunburst")?.endpoint,
  "openai/gpt-image-2.6/sunburst/text-to-image",
);
assert.deepEqual(
  mapAspectRatioToFalFormat("1:1", "gpt-image-2.6-sunburst"),
  "square_hd",
);
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

// fal's published rates for the payloads PostForge sends
assert.equal(getModel("nano-banana-2.1")?.pricing.amount, 0.04);
assert.equal(getModel("nano-banana-2.1")?.capabilities.referenceImages, true);
assert.equal(calculateEstimatedCost("seedream-5.5", { numImages: 2 }), 0.06);
assert.equal(getModel("kling-4.0")?.endpoint, "kling/v4/text-to-video");
assert.equal(Number(calculateEstimatedCost("kling-4.0", { durationSec: 10 }).toFixed(4)), 1.57);
assert.equal(
  Number(calculateEstimatedCost("seedance-2.5", { durationSec: 10, enableAudio: true }).toFixed(4)),
  4.73
);
assert.equal(
  Number(calculateEstimatedCost("pixverse-v6", { durationSec: 5, enableAudio: true }).toFixed(4)),
  0.3
);
assert.equal(Number(calculateEstimatedCost("pixverse-v6", { durationSec: 5 }).toFixed(4)), 0.225);
assert.equal(getModel("kling-4.0-i2v")?.capabilities.textToVideo, undefined);

// Every model the registry offers must be reachable in the picker: selecting it
// shows its card as the chosen one under one of the generation types.
for (const model of models) {
  const markup = renderToStaticMarkup(
    <ModelPicker selectedModel={model.id} onModelSelect={() => {}} models={models} />
  );
  const escaped = model.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(
    markup,
    new RegExp(`aria-pressed="true"[^>]*><span[^>]*>${escaped}</span>`),
    `${model.id} must be selectable in model-picker.tsx`
  );
}

console.log("model registry tests passed");
