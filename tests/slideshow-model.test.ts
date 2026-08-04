import assert from "node:assert/strict";
import { createBlankSlideshowProject } from "../src/components/slideshow/fixtures";
import {
  MAX_SLIDESHOW_SLIDES,
  addSlideshowSlide,
  deleteSlideshowSlide,
  duplicateSlideshowSlide,
  moveSlideshowSlide,
  reorderSlideshowSlides,
  setSlideshowCta,
} from "../src/components/slideshow/model";

let project = createBlankSlideshowProject();
assert.equal(project.slides[0].role, "hook");
assert.equal(project.slides.at(-1)?.role, "cta");
assert.deepEqual(
  project.slides.map((slide) => slide.order),
  [0, 1, 2, 3],
);

project = addSlideshowSlide(project, 1);
assert.equal(project.slides.length, 5);
assert.equal(project.slides.at(-1)?.role, "cta");
assert.equal(project.slides[2].role, "body");

const sourceId = project.slides[1].id;
project = duplicateSlideshowSlide(project, 1);
assert.equal(project.slides.length, 6);
assert.notEqual(project.slides[2].id, sourceId);
assert.match(project.slides[2].eyebrow, /variation/);

const beforeMove = project.slides.map((slide) => slide.id);
project = moveSlideshowSlide(project, 1, 3);
assert.equal(project.slides[3].id, beforeMove[1]);
assert.equal(project.slides[0].role, "hook");
assert.equal(project.slides.at(-1)?.role, "cta");

const reversedIds = [...project.slides].reverse().map((slide) => slide.id);
project = reorderSlideshowSlides(project, reversedIds);
assert.deepEqual(
  project.slides.map((slide) => slide.id),
  reversedIds,
);
assert.equal(project.slides[0].role, "hook");
assert.equal(project.slides.at(-1)?.role, "cta");

project = setSlideshowCta(project, false);
assert.equal(project.includeCta, false);
assert.equal(project.slides.at(-1)?.role, "body");

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

console.log("slideshow model tests passed");
