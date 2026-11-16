export function previewSlideOverlayTitle(input: {
  previewSlide: number;
  slideCount: number;
  hookStrategy: string;
}) {
  if (input.previewSlide === 0) return input.hookStrategy;
  if (input.previewSlide === input.slideCount - 1) return "Keep this for later";
  return `Point ${input.previewSlide}`;
}
