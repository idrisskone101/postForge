import assert from "node:assert/strict";
import {
  buildSlideshowImagePrompt,
  buildSlideshowImageQueueRequest,
} from "../../src/lib/ai/slideshow-image";

const prompt = buildSlideshowImagePrompt(
  "A calm morning routine beside a bright apartment window",
);

assert.match(prompt, /calm morning routine/);
assert.match(prompt, /original premium editorial photograph/i);
assert.match(prompt, /no text/i);
assert.match(prompt, /center safe area/i);
assert.throws(() => buildSlideshowImagePrompt("   "), /prompt is required/i);

const request = buildSlideshowImageQueueRequest({
  projectId: "project-1",
  slideId: "slide-1",
  prompt: "A bright editorial desk scene",
  aspectRatio: "4:5",
});
assert.equal(request.model, "nano-banana-2");
assert.equal(request.jobInput.kind, "slideshow-slide-image");
assert.equal(request.jobInput.projectId, "project-1");
assert.equal(request.jobInput.slideId, "slide-1");
assert.match(request.endpoint, /nano-banana/);
assert.ok(request.estimatedCost > 0);
assert.deepEqual(request.tags, [
  "slideshow",
  "slideshow:project-1",
  "slide:slide-1",
]);

console.log("slideshow image tests passed");
