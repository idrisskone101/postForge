export function previewOverlayPositionClass(
  hasAsset: boolean,
  previewSlide: number,
  slideCount: number
) {
  if (!hasAsset) {
    return "bottom-8 rounded-[8px] bg-[var(--pf-surface)]/95 p-3 text-[var(--pf-ink)] shadow-[var(--pf-shadow-2xs)]";
  }
  if (previewSlide === slideCount - 1) {
    return "bottom-10 rounded-[8px] bg-black/55 p-3 text-white";
  }
  if (previewSlide === 0) {
    return "top-14 text-white drop-shadow-md";
  }
  return "top-[44%] text-white drop-shadow-md";
}

export function previewSlideOverlayTitle(input: {
  previewSlide: number;
  slideCount: number;
  hookStrategy: string;
}) {
  if (input.previewSlide === 0) return input.hookStrategy;
  if (input.previewSlide === input.slideCount - 1) return "Keep this for later";
  return `Point ${input.previewSlide}`;
}
