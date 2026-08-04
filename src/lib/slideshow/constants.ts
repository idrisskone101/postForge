export const SLIDESHOW_PROJECT_STATUSES = [
  "draft",
  "generating",
  "ready",
  "scheduled",
  "published",
  "exported",
  "failed",
  "archived",
] as const;

export const SLIDESHOW_SLIDE_KINDS = ["hook", "content", "cta"] as const;

export const SLIDESHOW_AUTOMATION_STATUSES = [
  "paused",
  "active",
  "archived",
] as const;

export type SlideshowProjectStatusValue =
  (typeof SLIDESHOW_PROJECT_STATUSES)[number];
export type SlideshowSlideKindValue = (typeof SLIDESHOW_SLIDE_KINDS)[number];
export type SlideshowAutomationStatusValue =
  (typeof SLIDESHOW_AUTOMATION_STATUSES)[number];

export const MAX_SLIDES_PER_PROJECT = 20;
export const MAX_IMAGES_PER_COLLECTION = 500;

export const DEFAULT_PROJECT_SETTINGS = Object.freeze({
  aspectRatio: "9:16",
  phaseSettings: {
    hook: {
      grid: "none",
      overlayEnabled: true,
      overlayOpacity: 45,
      displayText: true,
    },
    body: {
      grid: "none",
      overlayEnabled: true,
      overlayOpacity: 45,
      displayText: true,
    },
    cta: {
      grid: "none",
      overlayEnabled: true,
      overlayOpacity: 45,
      displayText: true,
    },
  },
  textSettings: {
    font: "Poppins",
    color: "white",
    style: "outline",
    size: 56,
    position: "center",
    width: 88,
    align: "center",
  },
  includeCta: true,
  preventRepeats: true,
  language: "English",
  templateId: null,
});

export const DEFAULT_PROJECT_LAYOUT = Object.freeze({
  safeArea: { top: 8, right: 8, bottom: 8, left: 8 },
});

export const DEFAULT_SLIDE_CONTENT = Object.freeze({
  textItems: [],
});

export const DEFAULT_SLIDE_SETTINGS = Object.freeze({
  fontFamily: "Poppins",
  fontSize: 56,
  textColor: "#ffffff",
  textStyle: "outline",
  textAlign: "center",
  verticalPosition: "center",
  textWidth: 88,
  padded: true,
});

export const DEFAULT_SLIDE_LAYOUT = Object.freeze({
  text: { x: 50, y: 50, width: 88 },
});
