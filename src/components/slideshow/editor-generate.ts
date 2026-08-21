import { applyGeneratedSlideImage } from "./editor-image";
import type {
  SlideshowImageGenerationResult,
  SlideshowProject,
  SlideshowSlide,
} from "./types";

export async function runSlideCopyRegeneration(input: {
  activeSlide: SlideshowSlide;
  activeIndex: number;
  getDraft: () => SlideshowProject;
  onRegenerateSlide: (
    project: SlideshowProject,
    slide: SlideshowSlide,
  ) => Promise<SlideshowProject | Partial<SlideshowSlide> | void>;
  applyProject: (project: SlideshowProject) => void;
  setSelection: (id: string) => void;
  updateActiveSlide: (patch: Partial<SlideshowSlide>) => void;
  setSaveError: (error: string | null) => void;
}) {
  const { activeSlide, activeIndex, getDraft, onRegenerateSlide } = input;
  try {
    const result = await onRegenerateSlide(getDraft(), activeSlide);
    if (!result) return;
    if ("slides" in result) {
      input.applyProject(result);
      const matching = result.slides[activeIndex];
      if (matching) input.setSelection(matching.id);
    } else {
      input.updateActiveSlide(result);
    }
  } catch (error) {
    input.setSaveError(
      error instanceof Error
        ? error.message
        : "Could not regenerate this slide.",
    );
  }
}

export async function runSlideImageRegeneration(input: {
  activeIndex: number;
  getDraft: () => SlideshowProject;
  getSelectedId: () => string;
  flushSave: () => Promise<SlideshowProject>;
  waitForInFlightSave: () => Promise<void>;
  onRegenerateImage: (
    project: SlideshowProject,
    slide: SlideshowSlide,
    onQueuedRevision: (revision: number) => void,
  ) => Promise<SlideshowImageGenerationResult | void>;
  applyQueuedRevision: (revision: number) => void;
  applyProject: (project: SlideshowProject) => void;
  setSelection: (id: string) => void;
  setSaveError: (error: string | null) => void;
}) {
  try {
    const saved = await input.flushSave();
    const savedSlide =
      saved.slides.find((slide) => slide.id === input.getSelectedId()) ??
      saved.slides[input.activeIndex];
    if (!savedSlide) return;
    const result = await input.onRegenerateImage(
      saved,
      savedSlide,
      input.applyQueuedRevision,
    );
    if (!result) return;
    // Let any autosave that raced the background attachment settle first.
    await input.waitForInFlightSave();
    const applied = applyGeneratedSlideImage({
      current: input.getDraft(),
      savedSlide,
      result,
    });
    if (!applied) return;
    input.applyProject(applied.next);
    input.setSelection(applied.targetId);
  } catch (error) {
    input.setSaveError(
      error instanceof Error
        ? error.message
        : "Could not regenerate this slide image.",
    );
  }
}
