import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { SlideshowEditor } from "../../src/components/slideshow/slideshow-editor";
import { SlideshowViewSwitcher } from "../../src/components/slideshow/slideshow-view-modes";
import { createBlankSlideshowProject } from "../../src/components/slideshow/fixtures";
import {
  isEditableKeyboardTarget,
  parseSlideshowViewMode,
  phaseLabel,
  slideCoverImage,
  slideLayerCount,
  stepSlideIndex,
} from "../../src/components/slideshow/slideshow-view";
import type { SlideshowProject } from "../../src/components/slideshow/types";

const editorHeaderSource = readFileSync(
  new URL("../../src/components/slideshow/editor-header.tsx", import.meta.url),
  "utf8",
);
const editorPreviewSource = readFileSync(
  new URL("../../src/components/slideshow/editor-preview.tsx", import.meta.url),
  "utf8",
);
const editorWorkspaceSource = readFileSync(
  new URL("../../src/components/slideshow/editor-workspace.tsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../../src/app/(app)/slideshow/page.tsx", import.meta.url),
  "utf8",
);
const previewSource = readFileSync(
  new URL("../../src/components/slideshow/slide-preview.tsx", import.meta.url),
  "utf8",
);

const studioSource = readFileSync(
  new URL("../../src/components/slideshow/slideshow-studio.tsx", import.meta.url),
  "utf8",
);
assert.match(studioSource, /overflow-hidden/);
assert.match(editorWorkspaceSource, /h-full min-h-0/);
assert.match(editorHeaderSource, /SlideshowViewSwitcher/);
assert.match(editorWorkspaceSource, /SlideshowBoardView/);
assert.match(editorWorkspaceSource, /SlideshowPlayView/);
assert.match(editorPreviewSource, /slideCoverImage/);
assert.match(editorPreviewSource, /ArrowLeft/);
assert.match(pageSource, /parseSlideshowViewMode\(params\.view\)/);
assert.match(previewSource, /imageUrl\?:/);
assert.match(previewSource, /\/api\/slideshows\/overlay/);
assert.match(previewSource, /getSlideshowDimensions/);
assert.match(previewSource, /data-slide-canvas/);
assert.match(previewSource, /data:image\/svg\+xml/);
assert.match(previewSource, /backgroundSize: "contain"/);
assert.doesNotMatch(previewSource, /createSlideshowTextOverlayMarkup/);
assert.doesNotMatch(previewSource, /text-overlay-satori/);
assert.doesNotMatch(previewSource, /data-slide-stage/);
assert.doesNotMatch(previewSource, /100cqw/);
assert.doesNotMatch(previewSource, /ResizeObserver/);
assert.doesNotMatch(previewSource, /dangerouslySetInnerHTML/);
assert.doesNotMatch(previewSource, /object-contain/);
assert.doesNotMatch(previewSource, /1vw/);
assert.doesNotMatch(previewSource, /--slide-copy-size/);
assert.doesNotMatch(previewSource, /clamp\(13px/);

assert.equal(parseSlideshowViewMode(undefined), "edit");
assert.equal(parseSlideshowViewMode("board"), "board");
assert.equal(parseSlideshowViewMode("play"), "play");
assert.equal(parseSlideshowViewMode(["play", "board"]), "play");
assert.equal(parseSlideshowViewMode("unknown"), "edit");

assert.equal(stepSlideIndex(0, -1, 4, false), 0);
assert.equal(stepSlideIndex(0, -1, 4, true), 3);
assert.equal(stepSlideIndex(3, 1, 4, false), 3);
assert.equal(stepSlideIndex(3, 1, 4, true), 0);
assert.equal(stepSlideIndex(1, 1, 4, false), 2);
assert.equal(stepSlideIndex(0, 1, 0, true), 0);

assert.equal(phaseLabel("hook"), "Hook");
assert.equal(phaseLabel("content"), "Content");
assert.equal(phaseLabel("cta"), "CTA");

assert.equal(
  slideCoverImage({ imageUrl: "/a.jpg", imageUrls: ["/b.jpg", "/c.jpg"] }),
  "/b.jpg",
);
assert.equal(slideCoverImage({ imageUrl: "/a.jpg" }), "/a.jpg");
assert.equal(slideCoverImage({}), null);

assert.equal(
  slideLayerCount({ eyebrow: "Hook", headline: "Title", body: "Body" }),
  3,
);
assert.equal(slideLayerCount({ eyebrow: "", headline: "Title", body: "  " }), 1);

assert.equal(isEditableKeyboardTarget(null), false);

const noop = () => undefined;
const asyncNoop = async () => undefined;

function projectWithImages(): SlideshowProject {
  const project = createBlankSlideshowProject();
  return {
    ...project,
    slides: project.slides.map((slide, index) => ({
      ...slide,
      imageUrl: `/slide-${index + 1}.jpg`,
      headline: slide.headline || `Slide ${index + 1}`,
    })),
  };
}

const project = projectWithImages();

const switcherMarkup = renderToStaticMarkup(
  <SlideshowViewSwitcher value="edit" onChange={noop} />,
);
assert.match(switcherMarkup, /aria-label="Slideshow view"/);
assert.match(switcherMarkup, /data-slideshow-view-tab="edit"/);
assert.match(switcherMarkup, /data-slideshow-view-tab="board"/);
assert.match(switcherMarkup, /data-slideshow-view-tab="play"/);
assert.match(switcherMarkup, /All slides/);

function renderEditor(view: "edit" | "board" | "play") {
  return renderToStaticMarkup(
    <SlideshowEditor
      project={project}
      onBack={noop}
      onProjectChange={noop}
      onSaveProject={asyncNoop}
      onRegenerateSlide={asyncNoop}
      onRegenerateImage={asyncNoop}
      collections={[]}
      onPublish={noop}
      initialViewMode={view}
    />,
  );
}

const editMarkup = renderEditor("edit");
assert.match(editMarkup, /data-slideshow-view="edit"/);
assert.match(editMarkup, /data-slide-thumb=/);
assert.match(editMarkup, /\/slide-1\.jpg/);
assert.match(editMarkup, /layers/);
assert.match(editMarkup, /data-slideshow-text-overlay=/);
assert.match(editMarkup, /data-slide-canvas=/);
assert.doesNotMatch(editMarkup, /data:image\/svg\+xml/);
assert.doesNotMatch(editMarkup, /data-slide-stage=/);
assert.doesNotMatch(editMarkup, /100cqw/);
assert.doesNotMatch(editMarkup, /slideshow-text-shadow-/);
assert.doesNotMatch(editMarkup, /data-slideshow-view="board"/);
assert.doesNotMatch(editMarkup, /data-slideshow-view="play"/);
assert.ok((editMarkup.match(/data-slideshow-text-overlay=/g) ?? []).length >= 2);

const boardMarkup = renderEditor("board");
assert.match(boardMarkup, /data-slideshow-view="board"/);
assert.match(boardMarkup, /aria-label="Slideshow storyboard"/);
assert.match(boardMarkup, /Edit slide/);
assert.match(boardMarkup, /data-slide-board-card=/);
assert.equal((boardMarkup.match(/data-slide-board-card=/g) ?? []).length, project.slides.length);

const playMarkup = renderEditor("play");
assert.match(playMarkup, /data-slideshow-view="play"/);
assert.match(playMarkup, /aria-label="Slideshow playback"/);
assert.match(playMarkup, /data-slideshow-play-toggle=/);
assert.match(playMarkup, /Play slideshow/);
assert.match(playMarkup, /Space plays/);

console.log("slideshow view tests passed");
