import assert from "node:assert/strict";
import {
  formatGenerationPromptForEditing,
  humanizeGenerationFailure,
  summarizeGenerationPrompt,
} from "../src/lib/ai/prompt-presentation";

const malformedStructuredPrompt = JSON.stringify({
  aspect_ratio: "9:16",
  intent: "Slideshow slide background image",
  on_slide_text: "Discipline beats motivation",
  image_requirements: {
    realistic: true,
    no_baked_in_text: true,
    negative_space_for_copy: true,
  },
  aesthetic: [
    "CORE VIBE: quiet luxury",
    ...Array.from("MOOD: cinematic; moody"),
    "LIGHTING: natural window light",
  ],
});

assert.equal(
  summarizeGenerationPrompt(malformedStructuredPrompt),
  "Discipline beats motivation",
);

const editorPrompt = formatGenerationPromptForEditing(malformedStructuredPrompt);
assert.match(editorPrompt, /MOOD: cinematic; moody/);
assert.match(editorPrompt, /Scene direction for: Discipline beats motivation/);
assert.match(editorPrompt, /no baked-in text/);
assert.doesNotMatch(editorPrompt, /"aesthetic"/);
assert.ok(editorPrompt.length <= 1_900);

assert.equal(
  humanizeGenerationFailure(
    "Input should be a valid dictionary or object to extract fields from",
    "Generation failed.",
  ),
  "The image provider rejected this request format. Review the generation inputs, then try again.",
);
assert.equal(
  humanizeGenerationFailure("Provider capacity is temporarily unavailable.", "Generation failed."),
  "Provider capacity is temporarily unavailable.",
);

console.log("prompt presentation tests passed");
