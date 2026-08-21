import { updateSlideshowSlide } from "./model";
import type {
  SlideshowGrid,
  SlideshowImageGenerationResult,
  SlideshowProject,
  SlideshowSlide,
} from "./types";

export function gridRequiredCount(grid: SlideshowGrid): number {
  switch (grid) {
    case "1:3":
      return 3;
    case "2:2":
      return 4;
    case "none":
      return 1;
    case "1:2":
    case "2:1":
      return 2;
    default: {
      const _exhaustive: never = grid;
      return _exhaustive;
    }
  }
}

export function applyGeneratedSlideImage(input: {
  current: SlideshowProject;
  savedSlide: SlideshowSlide;
  result: SlideshowImageGenerationResult;
}): { next: SlideshowProject; targetId: string } | null {
  const { current, savedSlide, result } = input;
  const { projectRevision } = result;
  const slidePatch: Partial<SlideshowSlide> = {
    ...(result.imageUrl !== undefined
      ? {
          imageUrl: result.imageUrl,
          imageUrls: [],
        }
      : {}),
    ...(result.imageUrls !== undefined ? { imageUrls: result.imageUrls } : {}),
    ...(result.visualKey !== undefined ? { visualKey: result.visualKey } : {}),
    ...(result.visualKeys !== undefined ? { visualKeys: result.visualKeys } : {}),
  };
  const target =
    current.slides.find((slide) => slide.id === savedSlide.id) ??
    current.slides.find((slide) => slide.clientId === savedSlide.clientId);
  if (!target) return null;
  return {
    next: updateSlideshowSlide(
      {
        ...current,
        revision: Math.max(current.revision ?? 0, projectRevision ?? 0),
      },
      target.id,
      slidePatch,
    ),
    targetId: target.id,
  };
}
