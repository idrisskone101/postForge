import assert from "node:assert/strict";
import {
  buildSlideshowCreatorPrompt,
  parseSlideshowAestheticTemplate,
  slideshowCreatorLimits,
} from "../src/lib/ai/slideshow-creator";

const templateInput = {
  aesthetic: {
    core_vibe: "quiet luxury, understated confidence",
    mood: ["cinematic", "moody", "aspirational"],
    energy: "calm and self-assured",
  },
  visual_style: {
    genre: "editorial lifestyle photography",
    realism: "natural photographic realism",
    finish: "premium but slightly raw",
  },
  lighting: {
    style: "dramatic natural or practical lighting",
    exposure: "slightly underexposed",
    contrast: "high contrast",
    atmosphere: "dark surroundings with selective pools of light",
  },
  color: {
    palette: "muted and neutral",
    dominant_tones: ["black", "charcoal", "warm beige"],
    saturation: "low to moderate",
  },
  environment: {
    feel: "modern, premium, private",
    examples: ["dark training spaces", "modern interiors"],
  },
  camera_feel: {
    look: "full-frame editorial photography",
    depth_of_field: "moderate to shallow",
    texture: "subtle film grain",
  },
};

const template = parseSlideshowAestheticTemplate(templateInput);

assert.equal(template.aesthetic.core_vibe, "quiet luxury, understated confidence");
assert.equal(template.visual_style.genre, "editorial lifestyle photography");
assert.equal(template.color?.palette, "muted and neutral");

// Invalid / incomplete templates must throw (never silently pass).
assert.throws(() => parseSlideshowAestheticTemplate(null), /JSON object/i);
assert.throws(
  () => parseSlideshowAestheticTemplate({}),
  /'aesthetic' section/i,
);
assert.throws(
  () =>
    parseSlideshowAestheticTemplate({
      aesthetic: { core_vibe: "x" },
    }),
  /visual_style.genre/i,
);

// The per-slide prompt keeps the core vibe fixed and varies the scene.
const prompt = buildSlideshowCreatorPrompt(
  template,
  { slideId: "slide-1", text: "Discipline beats motivation" },
  "9:16",
);
const parsed = JSON.parse(prompt);
assert.equal(parsed.aspect_ratio, "9:16");
assert.equal(parsed.intent, "Slideshow slide background image");
assert.match(parsed.on_slide_text, /Discipline beats motivation/);
const aestheticText = parsed.aesthetic.join("\n");
assert.match(aestheticText, /quiet luxury, understated confidence/);
assert.match(aestheticText, /editorial lifestyle photography/);
assert.match(aestheticText, /CORE VIBE/);
assert.ok(parsed.aesthetic.includes("MOOD: cinematic; moody; aspirational"));
assert.equal(parsed.aesthetic.includes("M"), false, "mood must not be split into characters");
assert.equal(
  parsed.image_requirements.no_baked_in_text,
  true,
  "baked-in text must be forbidden (copy is overlaid in the renderer)",
);
assert.equal(parsed.image_requirements.matches_overlaid_copy, true);
assert.equal(parsed.image_requirements.negative_space_for_copy, true);

// Varying location/activity changes the scene while keeping the vibe.
const variant = buildSlideshowCreatorPrompt(
  template,
  {
    slideId: "slide-2",
    text: "Show up daily",
    scene: { location: "a quiet boxing gym", activity: "wrapping hands" },
  },
  "9:16",
);
const variantParsed = JSON.parse(variant);
const variantAesthetic = variantParsed.aesthetic.join("\n");
assert.match(variantAesthetic, /LOCATION: a quiet boxing gym/);
assert.match(variantAesthetic, /ACTIVITY: wrapping hands/);
assert.match(variantAesthetic, /quiet luxury, understated confidence/);

// 4:5 and 16:9 pass through to the aspect_ratio field.
const square = buildSlideshowCreatorPrompt(
  template,
  { slideId: "s", text: "t" },
  "1:1",
);
assert.equal(JSON.parse(square).aspect_ratio, "1:1");
// Limits are sane and stable (enforced in the generate-visuals route/lib).
assert.equal(slideshowCreatorLimits.maxSlides, 20);
assert.equal(slideshowCreatorLimits.maxReferenceImages, 14);

console.log("slideshow creator tests passed");
