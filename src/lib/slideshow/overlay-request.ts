import { badRequest } from "@/lib/slideshow/errors";
import {
  isSlideshowOverlayCanvasSize,
  type SlideshowRenderTextSettings,
  type SlideshowTextOverlaySlide,
} from "@/lib/slideshow/text-overlay";
import {
  isRecord,
  requireRecord,
  type JsonRecord,
} from "@/lib/slideshow/validation";

const OVERLAY_FONTS = [
  "Poppins",
  "Inter",
  "Serif",
  "SerifItalic",
  "Editorial",
  "Condensed",
  "Mono",
  "Rounded",
] as const;

const OVERLAY_STYLES = [
  "outline",
  "solid",
  "light",
  "translucent",
  "plain",
] as const;

const OVERLAY_POSITIONS = ["top", "center", "bottom"] as const;
const OVERLAY_ALIGNS = ["left", "center", "right"] as const;
const OVERLAY_PADDINGS = ["padded", "flush"] as const;

export type SlideshowOverlayRequest = {
  slide: SlideshowTextOverlaySlide;
  width: number;
  height: number;
  settings: SlideshowRenderTextSettings;
};

function optionalEmptyString(body: JsonRecord, key: string, max: number) {
  const value = body[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") badRequest(`${key} must be a string`);
  if (value.length > max) {
    badRequest(`${key} must be at most ${max} characters`);
  }
  return value;
}

function optionalFiniteNumber(
  body: JsonRecord,
  key: string,
  options: { min: number; max: number },
) {
  const value = body[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    badRequest(`${key} must be a number`);
  }
  if (value < options.min || value > options.max) {
    badRequest(`${key} must be between ${options.min} and ${options.max}`);
  }
  return value;
}

function parseSlide(value: unknown): SlideshowTextOverlaySlide {
  const slide = requireRecord(value, "slide");
  return {
    id: optionalEmptyString(slide, "id", 80) || "slide",
    eyebrow: optionalEmptyString(slide, "eyebrow", 160),
    headline: optionalEmptyString(slide, "headline", 180),
    body: optionalEmptyString(slide, "body", 420),
  };
}

function parseSettings(value: unknown): SlideshowRenderTextSettings {
  if (value === undefined) return {};
  const settings = requireRecord(value, "settings");
  const font = settings.font;
  if (
    font !== undefined &&
    (typeof font !== "string" ||
      !OVERLAY_FONTS.includes(font as (typeof OVERLAY_FONTS)[number]))
  ) {
    badRequest(`font must be one of: ${OVERLAY_FONTS.join(", ")}`);
  }
  const style = settings.style;
  if (
    style !== undefined &&
    (typeof style !== "string" ||
      !OVERLAY_STYLES.includes(style as (typeof OVERLAY_STYLES)[number]))
  ) {
    badRequest(`style must be one of: ${OVERLAY_STYLES.join(", ")}`);
  }
  const position = settings.position;
  if (
    position !== undefined &&
    (typeof position !== "string" ||
      !OVERLAY_POSITIONS.includes(position as (typeof OVERLAY_POSITIONS)[number]))
  ) {
    badRequest(`position must be one of: ${OVERLAY_POSITIONS.join(", ")}`);
  }
  const align = settings.align;
  if (
    align !== undefined &&
    (typeof align !== "string" ||
      !OVERLAY_ALIGNS.includes(align as (typeof OVERLAY_ALIGNS)[number]))
  ) {
    badRequest(`align must be one of: ${OVERLAY_ALIGNS.join(", ")}`);
  }
  const padding = settings.padding;
  if (
    padding !== undefined &&
    (typeof padding !== "string" ||
      !OVERLAY_PADDINGS.includes(padding as (typeof OVERLAY_PADDINGS)[number]))
  ) {
    badRequest(`padding must be one of: ${OVERLAY_PADDINGS.join(", ")}`);
  }
  const color = settings.color;
  if (color !== undefined) {
    if (typeof color !== "string" || color.length > 16) {
      badRequest("color must be a string of at most 16 characters");
    }
  }

  return {
    font: font as SlideshowRenderTextSettings["font"],
    color: color as string | undefined,
    style: style as SlideshowRenderTextSettings["style"],
    size: optionalFiniteNumber(settings, "size", { min: 8, max: 120 }),
    position: position as SlideshowRenderTextSettings["position"],
    width: optionalFiniteNumber(settings, "width", { min: 45, max: 100 }),
    align: align as SlideshowRenderTextSettings["align"],
    padding: padding as SlideshowRenderTextSettings["padding"],
    backgroundRadius: optionalFiniteNumber(settings, "backgroundRadius", {
      min: 0,
      max: 20,
    }),
  };
}

export function parseSlideshowOverlayRequest(body: unknown): SlideshowOverlayRequest {
  if (!isRecord(body)) badRequest("Request body must be a JSON object");
  const width = body.width;
  const height = body.height;
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  ) {
    badRequest("width and height must be integers");
  }
  if (!isSlideshowOverlayCanvasSize(width, height)) {
    badRequest("width and height must match a slideshow aspect canvas");
  }
  return {
    slide: parseSlide(body.slide),
    width,
    height,
    settings: parseSettings(body.settings),
  };
}
