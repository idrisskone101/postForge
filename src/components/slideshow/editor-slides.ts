import {
  addSlideshowSlide,
  deleteSlideshowSlide,
  duplicateSlideshowSlide,
  moveSlideshowSlide,
  setSlideshowCta,
} from "./model";
import type { SlideshowProject, SlideshowSlideKind } from "./types";

export function projectWithAddedSlide(
  draft: SlideshowProject,
  activeIndex: number,
): { project: SlideshowProject; selectedId: string } | null {
  const next = addSlideshowSlide(draft, activeIndex);
  if (next === draft) return null;
  const added = next.slides.find(
    (slide) => !draft.slides.some((current) => current.id === slide.id),
  );
  return {
    project: next,
    selectedId: added?.id ?? next.slides[0]?.id ?? "",
  };
}

export function projectWithDuplicatedSlide(
  draft: SlideshowProject,
  activeIndex: number,
): { project: SlideshowProject; selectedId: string } | null {
  const next = duplicateSlideshowSlide(draft, activeIndex);
  if (next === draft) return null;
  const added = next.slides.find(
    (slide) => !draft.slides.some((current) => current.id === slide.id),
  );
  return {
    project: next,
    selectedId: added?.id ?? next.slides[0]?.id ?? "",
  };
}

export function projectWithDeletedSlide(
  draft: SlideshowProject,
  activeIndex: number,
): { project: SlideshowProject; selectedId: string } | null {
  const next = deleteSlideshowSlide(draft, activeIndex);
  if (next === draft) return null;
  const nextIndex = Math.min(activeIndex, next.slides.length - 1);
  return {
    project: next,
    selectedId: next.slides[nextIndex]?.id ?? "",
  };
}

export function projectWithMovedSlide(
  draft: SlideshowProject,
  activeIndex: number,
  direction: -1 | 1,
): SlideshowProject | null {
  const next = moveSlideshowSlide(draft, activeIndex, activeIndex + direction);
  return next === draft ? null : next;
}

export function projectForPhaseSelection(
  draft: SlideshowProject,
  phase: SlideshowSlideKind,
): { selectedId: string; project?: SlideshowProject } | null {
  const match = draft.slides.find((slide) => slide.kind === phase);
  if (match) return { selectedId: match.id };
  if (phase !== "cta") return null;
  const next = setSlideshowCta(draft, true);
  return {
    project: next,
    selectedId: next.slides.at(-1)?.id ?? next.slides[0]?.id ?? "",
  };
}
