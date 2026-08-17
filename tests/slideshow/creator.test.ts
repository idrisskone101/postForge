import assert from "node:assert/strict";
import {
  buildSlideshowCreatorPrompt,
  deriveTemplateFromReferences,
  parseSlideshowAestheticTemplate,
  planSlideshowCreatorScenes,
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
assert.equal(variantParsed.assigned_scene.mandatory, true);
assert.match(variantParsed.assigned_scene.environment_brief, /boxing gym/);
assert.match(variantParsed.assigned_scene.direction, /Make the creative decisions/i);

// A deck-level plan deliberately spans lifestyle categories instead of relying
// on the image model to interpret a loose list of environment examples.
const planned = planSlideshowCreatorScenes(
  template,
  Array.from({ length: 6 }, (_, index) => ({
    slideId: `planned-${index + 1}`,
    text: `Slide ${index + 1}`,
  })),
);
assert.equal(planned.length, 6);
assert.equal(
  new Set(planned.map((slide) => slide.scene?.archetype)).size,
  planned.length,
  "normal six-slide decks should not repeat a scene archetype",
);
assert.ok(
  planned.every(
    (slide) => /^(Invent|Choose)\b/.test(slide.scene?.location ?? "") &&
      /^(Choose|Show)\b/.test(slide.scene?.activity ?? ""),
  ),
  "the planner should delegate concrete scene invention instead of hard-coding examples",
);
assert.doesNotMatch(
  planned.map((slide) => slide.scene?.location).join(" "),
  /Porsche|airplane cabin/i,
);

// Scene diversity is intrinsic: a valid aesthetic with zero environment
// examples still receives a complete, non-repeating creative portfolio.
const exampleFreeTemplate = parseSlideshowAestheticTemplate({
  aesthetic: {
    core_vibe: "dark masculine discipline with understated confidence",
    mood: ["moody", "focused"],
  },
  visual_style: {
    genre: "editorial lifestyle photography",
    realism: "natural photographic realism",
  },
});
const exampleFreePlan = planSlideshowCreatorScenes(
  exampleFreeTemplate,
  Array.from({ length: 8 }, (_, index) => ({
    slideId: `example-free-${index + 1}`,
    text: `Example-free slide ${index + 1}`,
  })),
);
assert.equal(
  new Set(exampleFreePlan.map((slide) => slide.scene?.archetype)).size,
  8,
);
assert.ok(
  exampleFreePlan.every(
    (slide) => slide.scene?.location?.length && slide.scene.activity?.length,
  ),
);

// Manual slide direction remains authoritative even when the planner fills the
// rest of the deck.
const manual = planSlideshowCreatorScenes(template, [
  {
    slideId: "manual",
    text: "Keep moving",
    scene: {
      location: "a rain-soaked basketball court",
      activity: "tying his shoes courtside",
      subject: "the same male protagonist",
    },
  },
]);
assert.equal(manual[0].scene?.location, "a rain-soaked basketball court");
assert.equal(manual[0].scene?.activity, "tying his shoes courtside");
assert.equal(manual[0].scene?.subject, "the same male protagonist");
assert.equal(manual[0].scene?.archetype, "operator-directed");

// A grounded, non-aspirational template still gets broader environments, but
// should not invent luxury-status props that clash with its visual direction.
const groundedTemplate = parseSlideshowAestheticTemplate({
  aesthetic: {
    core_vibe: "warm neighborhood craft and everyday usefulness",
    mood: ["grounded", "friendly"],
  },
  visual_style: {
    genre: "candid documentary photography",
    realism: "natural photographic realism",
  },
  environment: {
    feel: "local and lived-in",
    examples: ["community workshop", "neighborhood market"],
  },
});
const grounded = planSlideshowCreatorScenes(
  groundedTemplate,
  Array.from({ length: 4 }, (_, index) => ({
    slideId: `grounded-${index + 1}`,
    text: `Grounded slide ${index + 1}`,
  })),
);
assert.doesNotMatch(
  grounded.map((slide) => slide.scene?.location).join(" "),
  /Porsche/i,
);

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

async function testDeriveTemplateFromReferences() {
  const imageBytes = Buffer.from("fake-png-bytes", "utf8");
  let capturedUrl = "";
  let capturedBody = "";
  let capturedAuth = "";
  const result = await deriveTemplateFromReferences(
    [
      "https://cdn.example.com/ref-1.jpg",
      "https://cdn.example.com/ref-2.jpg",
      "not-a-url",
    ],
    {
      model: "gemma4",
      apiKey: "test-key",
      fetchImpl: async (input, init) => {
        const url = String(input);
        if (url.startsWith("https://cdn.example.com/")) {
          return new Response(imageBytes, {
            status: 200,
            headers: { "Content-Type": "image/png" },
          });
        }
        capturedUrl = url;
        capturedBody = String(init?.body ?? "");
        capturedAuth = String(
          (init?.headers as Record<string, string>)?.Authorization ?? "",
        );
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(templateInput) } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  );

  assert.equal(capturedUrl, "https://ollama.com/v1/chat/completions");
  assert.equal(capturedAuth, "Bearer test-key");
  const payload = JSON.parse(capturedBody);
  assert.equal(payload.model, "gemma4");
  assert.equal(payload.stream, false);
  const userMessage = payload.messages.find(
    (message: { role: string }) => message.role === "user",
  );
  const imageParts = userMessage.content.filter(
    (part: { type: string }) => part.type === "image_url",
  );
  assert.equal(imageParts.length, 2, "non-HTTPS URLs must be filtered out");
  // Ollama Cloud rejects plain URLs: images must be inlined as base64 data URIs.
  const expectedDataUri = `data:image/png;base64,${imageBytes.toString("base64")}`;
  assert.equal(imageParts[0].image_url.url, expectedDataUri);
  assert.equal(imageParts[1].image_url.url, expectedDataUri);
  assert.equal(result.model, "gemma4");
  assert.equal(result.referenceCount, 2);
  assert.equal(
    result.template.aesthetic.core_vibe,
    "quiet luxury, understated confidence",
  );

  await assert.rejects(
    () =>
      deriveTemplateFromReferences(["https://cdn.example.com/ref-1.jpg"], {
        model: "gemma4",
        apiKey: "test-key",
        fetchImpl: async (input) => {
          const url = String(input);
          if (url.startsWith("https://cdn.example.com/")) {
            return new Response(imageBytes, {
              status: 200,
              headers: { "Content-Type": "image/jpeg" },
            });
          }
          return new Response("bad request", { status: 400 });
        },
      }),
    /HTTP 400/,
  );

  // An unfetchable reference image must surface an explicit error.
  await assert.rejects(
    () =>
      deriveTemplateFromReferences(["https://cdn.example.com/missing.jpg"], {
        model: "gemma4",
        apiKey: "test-key",
        fetchImpl: async () => new Response("not found", { status: 404 }),
      }),
    /could not be fetched \(HTTP 404\)/,
  );

  await assert.rejects(
    () =>
      deriveTemplateFromReferences([], {
        model: "gemma4",
        apiKey: "test-key",
        fetchImpl: globalThis.fetch,
      }),
    /At least one reference image/,
  );
}

testDeriveTemplateFromReferences()
  .then(() => console.log("slideshow creator tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
