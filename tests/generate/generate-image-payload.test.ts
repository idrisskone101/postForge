import assert from "node:assert/strict";
import { buildImageProviderRequest } from "../../src/lib/ai/generate-image";
import { GPT_IMAGE_2_PORTRAIT_9_16 } from "../../src/lib/ai/models";

const gpt25 = buildImageProviderRequest({
  prompt: "Blank matte-black phone screen on a bathroom counter",
  model: "gpt-image-2.5",
  aspectRatio: "9:16",
});
assert.equal(gpt25.endpoint, "openai/gpt-image-2.5/flare/text-to-image");
assert.equal(gpt25.payload.quality, "high");
assert.equal(gpt25.payload.output_format, "png");
assert.deepEqual(gpt25.payload.image_size, GPT_IMAGE_2_PORTRAIT_9_16);

const sunburst = buildImageProviderRequest({
  prompt: "Nightstand lifestyle",
  model: "gpt-image-2.5-sunburst",
  aspectRatio: "16:9",
});
assert.equal(
  sunburst.endpoint,
  "openai/gpt-image-2.5/sunburst/text-to-image",
);
assert.equal(sunburst.payload.image_size, "landscape_16_9");
assert.equal(sunburst.payload.quality, "high");

const gpt2 = buildImageProviderRequest({
  prompt: "legacy",
  model: "gpt-image-2",
  aspectRatio: "1:1",
});
assert.equal(gpt2.endpoint, "openai/gpt-image-2");
assert.equal(gpt2.payload.image_size, "square_hd");

console.log("generate-image GPT Image 2.5 payload tests passed");
