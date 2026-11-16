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

const nanoBanana21 = buildImageProviderRequest({
  prompt: "Phone on a marble counter",
  model: "nano-banana-2.1",
  aspectRatio: "9:16",
});
assert.equal(nanoBanana21.endpoint, "google/nano-banana-2.1");
assert.equal(nanoBanana21.payload.aspect_ratio, "9:16");
assert.equal(nanoBanana21.payload.image_size, undefined);
assert.equal(nanoBanana21.payload.safety_tolerance, "6");

const nanoBanana21Edit = buildImageProviderRequest({
  prompt: "Same person, new outfit",
  model: "nano-banana-2.1",
  aspectRatio: "9:16",
  imageUrls: ["https://example.com/ref.png"],
  editEndpoint: true,
});
assert.equal(nanoBanana21Edit.endpoint, "google/nano-banana-2.1/edit");
assert.deepEqual(nanoBanana21Edit.payload.image_urls, ["https://example.com/ref.png"]);

const seedream55 = buildImageProviderRequest({
  prompt: "Portrait",
  model: "seedream-5.5",
  aspectRatio: "9:16",
});
assert.deepEqual(seedream55.payload.image_size, { width: 1152, height: 2048 });

const flux2Pro = buildImageProviderRequest({
  prompt: "Landscape",
  model: "flux-2-pro",
  aspectRatio: "4:5",
});
assert.deepEqual(flux2Pro.payload.image_size, { width: 1280, height: 1600 });
assert.equal(flux2Pro.payload.safety_tolerance, "5");

const flux3 = buildImageProviderRequest({ prompt: "Poster", model: "flux-3", aspectRatio: "3:2" });
assert.equal(flux3.endpoint, "blackforestlabs/flux-3/text-to-image");
assert.equal(flux3.payload.aspect_ratio, "3:2");
assert.equal(flux3.payload.resolution, "1k");
assert.equal(flux3.payload.safety_tolerance, 4);

const muse = buildImageProviderRequest({ prompt: "Chart", model: "muse-image", aspectRatio: "1:1" });
assert.equal(muse.payload.aspect_ratio, "1:1");
assert.equal(muse.payload.output_format, "png");

const ideogram = buildImageProviderRequest({ prompt: "Logo", model: "ideogram-v3", aspectRatio: "9:16" });
assert.equal(ideogram.payload.image_size, "portrait_16_9");

const zImage = buildImageProviderRequest({ prompt: "Fast", model: "z-image-turbo", aspectRatio: "16:9" });
assert.deepEqual(zImage.payload.image_size, { width: 2048, height: 1152 });

// fal's Nano Banana schemas take aspect_ratio and have no image_size field.
for (const model of ["nano-banana", "nano-banana-2", "nano-banana-pro"]) {
  const request = buildImageProviderRequest({ prompt: "Ratio", model, aspectRatio: "9:16" });
  assert.equal(request.payload.aspect_ratio, "9:16", `${model} sends aspect_ratio`);
  assert.equal(request.payload.image_size, undefined, `${model} sends no image_size`);
}

console.log("generate-image payload tests passed");
