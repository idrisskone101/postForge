import assert from "node:assert/strict";
import {
  outputAccessibleName,
  outputMeta,
  outputTitle,
} from "../../src/lib/ai/output-presentation";
import { promptTitle, structuredPromptLead } from "../../src/lib/ai/prompt-presentation";

const identityPrompt = JSON.stringify({
  task: "Create one photorealistic image of the avatar holding the product.",
  identity: { gender: "Female", age: "25-30" },
});

assert.equal(
  promptTitle(identityPrompt),
  "Create one photorealistic image of the avatar holding the product.",
);
assert.equal(
  promptTitle("IMG_7123.HEIC.   A woman   holding\n a mug"),
  "A woman holding a mug",
);
assert.equal(promptTitle("clip-final.mp4: slow pan across a desk"), "slow pan across a desk");
assert.equal(promptTitle("A photo of v2.5 packaging"), "A photo of v2.5 packaging");
assert.equal(promptTitle("@Element1 Person waving"), "Person waving");
assert.equal(promptTitle(JSON.stringify({ identity: { gender: "Female" } })), "");
assert.equal(promptTitle('{ "task": "Create one portrait", "identity": { "gen'), "Create one portrait");
assert.equal(promptTitle('{ "identity": { "gen'), "");
assert.equal(promptTitle("   "), "");
assert.equal(promptTitle(null), "");
assert.equal(promptTitle("word ".repeat(80)).endsWith("…"), true);
assert.equal(promptTitle("word ".repeat(80)).length <= 140, true);

assert.equal(structuredPromptLead("A plain prompt"), null);
assert.equal(structuredPromptLead(JSON.stringify({ on_slide_text: "Slide", task: "Task" })), "Slide");

assert.equal(outputTitle({ prompt: "A woman holding a mug", model: "nano-banana-2" }), "A woman holding a mug");
assert.notEqual(outputTitle({ prompt: "", model: "nano-banana-2" }), "");
assert.equal(outputTitle({ prompt: undefined, model: "unregistered-model" }), "unregistered-model");

assert.equal(outputMeta("image", "Nano Banana 2", "Aug 19"), "Image - Nano Banana 2 - Aug 19");
assert.equal(outputMeta("video", "Kling 3.0", ""), "Video - Kling 3.0");

const first = outputAccessibleName({ prompt: "", model: "m", createdAt: "2026-08-19T12:00:00Z" });
const second = outputAccessibleName({ prompt: "", model: "m", createdAt: "2026-08-21T12:00:00Z" });
assert.match(first, /^m, Aug 19/);
assert.notEqual(first, second);

console.log("output presentation tests passed");
