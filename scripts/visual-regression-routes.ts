export const VISUAL_REGRESSION_ROUTES = [
  "/",
  "/jobs",
  "/ugc-inspiration",
  "/ugc-clone",
  "/slideshow",
  "/gallery",
  "/automations",
  "/automations/new",
  "/performance",
  "/costs",
  "/generate",
  "/collections",
  "/characters",
  "/characters/new",
  "/settings",
  "/slideshow?new=true",
  "/gallery?reviewStatus=needs_review",
  "/settings?tab=integrations",
] as const;

export const VISUAL_VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

export const CRITICAL_OVERFLOW_SELECTORS = [
  "h1",
  "[data-home-title]",
  "[data-character-title]",
  ".policy-heading",
  "#workspace-header-default-action",
  ".pf-button-primary",
] as const;
