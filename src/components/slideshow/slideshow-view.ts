import type { SlideshowSlide, SlideshowViewMode } from "./types";

export const SLIDESHOW_VIEW_MODES = ["edit", "board", "play"] as const;

export type { SlideshowViewMode };

export const SLIDESHOW_PLAY_INTERVAL_MS = 3000;

export function parseSlideshowViewMode(
  value: string | string[] | undefined | null,
): SlideshowViewMode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "board" || raw === "play" || raw === "edit" ? raw : "edit";
}

export function stepSlideIndex(
  current: number,
  delta: -1 | 1,
  length: number,
  wrap: boolean,
): number {
  if (length <= 0) return 0;
  const next = current + delta;
  if (wrap) return (next + length) % length;
  return Math.max(0, Math.min(length - 1, next));
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || typeof HTMLElement === "undefined") return false;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function slideCoverImage(
  slide: Pick<SlideshowSlide, "imageUrl" | "imageUrls">,
): string | null {
  const fromList = slide.imageUrls?.find(
    (url) => typeof url === "string" && url.trim().length > 0,
  );
  if (fromList) return fromList;
  return slide.imageUrl ?? null;
}

export function slideLayerCount(
  slide: Pick<SlideshowSlide, "eyebrow" | "headline" | "body">,
): number {
  return [slide.eyebrow, slide.headline, slide.body].filter(
    (value) => value.trim().length > 0,
  ).length;
}

export function phaseLabel(kind: SlideshowSlide["kind"]): string {
  return kind === "content" ? "Content" : kind === "cta" ? "CTA" : "Hook";
}
