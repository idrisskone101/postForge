import assert from "node:assert/strict";
import {
  generateSlideshowStory,
  slideshowStoryLimits,
} from "../src/lib/ai/slideshow-story";

async function main() {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const story = await generateSlideshowStory({
      idea: "building a calmer reminder habit",
      slideCount: 7,
      audience: "people tired of noisy productivity advice",
    });

    assert.equal(story.provider, "local-fallback");
    assert.equal(story.model, null);
    assert.equal(story.slides.length, 7);
    assert.equal(story.slides[0].role, "hook");
    assert.equal(story.slides.at(-1)?.role, "cta");
    assert.ok(story.slides.every((slide) => slide.heading.length > 0));
    assert.ok(story.slides.every((slide) => slide.imagePrompt.length > 0));

    const noCta = await generateSlideshowStory({
      idea: "showing a product launch behind the scenes",
      slideCount: 4,
      includeCta: false,
    });
    assert.equal(noCta.slides.at(-1)?.role, "body");

    const clamped = await generateSlideshowStory({
      idea: "a concise test",
      slideCount: 100,
    });
    assert.equal(clamped.slides.length, slideshowStoryLimits.maxSlides);

    await assert.rejects(
      () => generateSlideshowStory({ idea: "   " }),
      /idea is required/i,
    );
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
  }

  console.log("slideshow story tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
