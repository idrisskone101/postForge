import assert from "node:assert/strict";
import { createBlankSlideshowProject } from "../../src/components/slideshow/fixtures";
import {
  deserializeSlideshowProject,
  serializeSlideshowProject,
} from "../../src/lib/slideshow/client";
import {
  MAX_SLIDESHOW_SLIDES,
  addSlideshowSlide,
  alignCreatorDirectImages,
  applyDirectSlideshowImages,
  deleteSlideshowSlide,
  duplicateSlideshowSlide,
  moveSlideshowSlide,
  reorderSlideshowSlides,
  setSlideshowCta,
} from "../../src/components/slideshow/model";

const withDirectImages = applyDirectSlideshowImages(
  createBlankSlideshowProject(),
  ["/api/collection-assets/pinterest-1", "/api/collection-assets/pinterest-2"],
);
assert.equal(
  withDirectImages.slides[0].imageUrl,
  "/api/collection-assets/pinterest-1",
);
assert.equal(
  withDirectImages.slides[1].imageUrl,
  "/api/collection-assets/pinterest-2",
);
assert.equal(withDirectImages.slides[2].imageUrl, null);
assert.equal(withDirectImages.status, "draft");

const directReady = applyDirectSlideshowImages(
  createBlankSlideshowProject(),
  Array.from({ length: 4 }, (_, index) => `/api/collection-assets/pin-${index + 1}`),
);
assert.equal(directReady.status, "ready");

const sparseDirect = applyDirectSlideshowImages(createBlankSlideshowProject(), [
  null,
  "/api/collection-assets/slide-2",
  undefined,
  "/api/collection-assets/slide-4",
]);
assert.equal(sparseDirect.slides[0].imageUrl, null);
assert.equal(sparseDirect.slides[1].imageUrl, "/api/collection-assets/slide-2");
assert.equal(sparseDirect.slides[2].imageUrl, null);
assert.equal(sparseDirect.slides[3].imageUrl, "/api/collection-assets/slide-4");
assert.equal(sparseDirect.status, "draft");

assert.deepEqual(
  alignCreatorDirectImages({
    hookAssetId: "hook-asset",
    slideLines: ["First point", "", "Third point", ""],
    slideAssetIds: [null, "ignored-empty", "third-asset", "also-ignored"],
  }),
  ["hook-asset", null, "third-asset"],
);

let project = createBlankSlideshowProject();
assert.equal(project.slides[0].kind, "hook");
assert.equal(project.slides.at(-1)?.kind, "cta");
assert.deepEqual(
  project.slides.map((slide) => slide.order),
  [0, 1, 2, 3],
);

project = addSlideshowSlide(project, 1);
assert.equal(project.slides.length, 5);
assert.equal(project.slides.at(-1)?.kind, "cta");
assert.equal(project.slides[2].kind, "content");

const sourceId = project.slides[1].id;
project = duplicateSlideshowSlide(project, 1);
assert.equal(project.slides.length, 6);
assert.notEqual(project.slides[2].id, sourceId);
assert.match(project.slides[2].eyebrow, /variation/);

const beforeMove = project.slides.map((slide) => slide.id);
project = moveSlideshowSlide(project, 1, 3);
assert.equal(project.slides[3].id, beforeMove[1]);
assert.equal(project.slides[0].kind, "hook");
assert.equal(project.slides.at(-1)?.kind, "cta");

const reversedIds = [...project.slides].reverse().map((slide) => slide.id);
project = reorderSlideshowSlides(project, reversedIds);
assert.deepEqual(
  project.slides.map((slide) => slide.id),
  reversedIds,
);
assert.equal(project.slides[0].kind, "hook");
assert.equal(project.slides.at(-1)?.kind, "cta");

project = setSlideshowCta(project, false);
assert.equal(project.includeCta, false);
assert.equal(project.slides.at(-1)?.kind, "content");

while (project.slides.length < MAX_SLIDESHOW_SLIDES) {
  project = addSlideshowSlide(project);
}
const capped = addSlideshowSlide(project);
assert.strictEqual(capped, project);
assert.equal(capped.slides.length, MAX_SLIDESHOW_SLIDES);

while (project.slides.length > 1) {
  project = deleteSlideshowSlide(project, project.slides.length - 1);
}
const protectedLastSlide = deleteSlideshowSlide(project, 0);
assert.strictEqual(protectedLastSlide, project);
assert.equal(project.slides.length, 1);

const styledProject = createBlankSlideshowProject();
styledProject.textSettings = {
  ...styledProject.textSettings,
  font: "Editorial",
  style: "light",
  padding: "flush",
  backgroundRadius: 12,
};
const serialized = serializeSlideshowProject(styledProject);
assert.equal(serialized.settings.textSettings.font, "Editorial");
assert.equal(serialized.settings.textSettings.style, "light");
assert.equal(serialized.settings.textSettings.padding, "flush");
assert.equal(serialized.settings.textSettings.backgroundRadius, 12);
assert.equal(serialized.slides[0].settings.padded, false);

const roundTripped = deserializeSlideshowProject({
  id: "persisted-slideshow",
  ...serialized,
  revision: 1,
  updatedAt: new Date().toISOString(),
});
assert.equal(roundTripped.textSettings.font, "Editorial");
assert.equal(roundTripped.textSettings.style, "light");
assert.equal(roundTripped.textSettings.padding, "flush");
assert.equal(roundTripped.textSettings.backgroundRadius, 12);

console.log("slideshow model tests passed");
