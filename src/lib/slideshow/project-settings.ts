import {
  DEFAULT_PROJECT_SETTINGS,
  SLIDESHOW_PROJECT_STATUSES,
} from "@/lib/slideshow/constants";
import { slideshowOverlayTextColor } from "@/lib/slideshow/text-overlay";
import type {
  SlideshowAspectRatio,
  SlideshowGrid,
  SlideshowKindSettings,
  SlideshowProjectStatus,
  SlideshowSlideKind,
  SlideshowTextColorToken,
  SlideshowTextSettings,
} from "@/lib/slideshow/project";

type JsonRecord = Record<string, unknown>;

const LEGACY_CORAL_HEX = "#ff7a59";
const LEGACY_BLUE_HEX = "#4f9fd9";

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function asNonNegativeInteger(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

export function asDateHistory(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && Number.isFinite(Date.parse(item)),
      )
    : [];
}

export function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

export function canonicalizePhaseSettings(
  value: unknown,
  fallback?: SlideshowKindSettings,
): Record<SlideshowSlideKind, SlideshowKindSettings> {
  const stored = isRecord(value) ? value : {};
  const base: SlideshowKindSettings = fallback ?? {
    grid: "none",
    overlayEnabled: true,
    overlayOpacity: 45,
    displayText: true,
  };
  const read = (kind: SlideshowSlideKind): SlideshowKindSettings => {
    const legacyKey = kind === "content" ? "body" : kind;
    const raw = isRecord(stored[kind])
      ? stored[kind]
      : isRecord(stored[legacyKey])
        ? stored[legacyKey]
        : {};
    return {
      grid: normalizeGrid(raw.grid ?? base.grid),
      overlayEnabled: asBoolean(raw.overlayEnabled, base.overlayEnabled),
      overlayOpacity: asNumber(raw.overlayOpacity, base.overlayOpacity),
      displayText: asBoolean(raw.displayText, base.displayText),
    };
  };
  return { hook: read("hook"), content: read("content"), cta: read("cta") };
}

export function normalizeGrid(value: unknown): SlideshowGrid {
  return value === "1:2" ||
    value === "1:3" ||
    value === "2:1" ||
    value === "2:2"
    ? value
    : "none";
}

export function normalizeAspectRatio(value: unknown): SlideshowAspectRatio {
  return value === "4:5" || value === "1:1" || value === "16:9"
    ? value
    : "9:16";
}

export function normalizeStatus(value: unknown): SlideshowProjectStatus {
  return (SLIDESHOW_PROJECT_STATUSES as readonly string[]).includes(
    asString(value),
  )
    ? (value as SlideshowProjectStatus)
    : "draft";
}

function normalizeFont(value: unknown): SlideshowTextSettings["font"] {
  return value === "Inter" ||
    value === "Serif" ||
    value === "SerifItalic" ||
    value === "Editorial" ||
    value === "Condensed" ||
    value === "Mono" ||
    value === "Rounded"
    ? value
    : "Poppins";
}

function hexKey(value: string) {
  return value.trim().toLowerCase();
}

export function slideshowTextColorToken(value: unknown): SlideshowTextColorToken {
  const raw = asString(value, "white");
  const key = hexKey(raw);
  if (key === "black" || key === "#000" || key === "#000000" || key === "#111111") {
    return "black";
  }
  if (
    key === "coral" ||
    key === hexKey(slideshowOverlayTextColor("coral")) ||
    key === LEGACY_CORAL_HEX
  ) {
    return "coral";
  }
  if (
    key === "blue" ||
    key === hexKey(slideshowOverlayTextColor("blue")) ||
    key === LEGACY_BLUE_HEX
  ) {
    return "blue";
  }
  if (
    key === "yellow" ||
    key === hexKey(slideshowOverlayTextColor("yellow"))
  ) {
    return "yellow";
  }
  if (key === "white" || key === "#fff" || key === "#ffffff") return "white";
  if (key === "custom" || /^#[0-9a-f]{3,8}$/i.test(raw)) return "custom";
  return "white";
}

export function slideshowTextColorHex(settings: SlideshowTextSettings) {
  if (settings.color === "custom") {
    return settings.customColor ?? "#ffffff";
  }
  return slideshowOverlayTextColor(settings.color);
}

export function defaultKindSettings(): SlideshowKindSettings {
  const hook = DEFAULT_PROJECT_SETTINGS.phaseSettings.hook;
  return {
    grid: normalizeGrid(hook.grid),
    overlayEnabled: hook.overlayEnabled,
    overlayOpacity: hook.overlayOpacity,
    displayText: hook.displayText,
  };
}

export function defaultTextSettings(): SlideshowTextSettings {
  const stored = DEFAULT_PROJECT_SETTINGS.textSettings;
  return {
    font: normalizeFont(stored.font),
    color: slideshowTextColorToken(stored.color),
    style:
      stored.style === "solid" ||
      stored.style === "light" ||
      stored.style === "translucent" ||
      stored.style === "plain"
        ? stored.style
        : "outline",
    size: stored.size,
    position:
      stored.position === "top" || stored.position === "bottom"
        ? stored.position
        : "center",
    width: stored.width,
    align:
      stored.align === "left" || stored.align === "right" ? stored.align : "center",
    padding: stored.padding === "flush" ? "flush" : "padded",
    backgroundRadius: stored.backgroundRadius,
  };
}

export function readTextSettings(
  settings: JsonRecord,
  firstSlide?: JsonRecord,
): SlideshowTextSettings {
  const stored = isRecord(settings.textSettings) ? settings.textSettings : {};
  const slideSettings = isRecord(firstSlide?.settings) ? firstSlide.settings : {};
  const defaults = defaultTextSettings();
  const font = asString(stored.font ?? slideSettings.fontFamily, defaults.font);
  const colorValue = asString(
    stored.color ?? slideSettings.textColor,
    defaults.color,
  );
  const token = slideshowTextColorToken(colorValue);
  const customColorValue = asString(
    stored.customColor,
    /^#[0-9a-f]{3,8}$/i.test(colorValue) ? colorValue : "#ffffff",
  );
  const styleValue = asString(
    stored.style ?? slideSettings.textStyle,
    defaults.style,
  );
  const positionValue = asString(
    stored.position ?? slideSettings.verticalPosition,
    defaults.position,
  );
  const alignValue = asString(
    stored.align ?? slideSettings.textAlign,
    defaults.align,
  );
  const paddingValue = asString(stored.padding, defaults.padding);

  return {
    font: normalizeFont(font),
    color: token,
    customColor: token === "custom" ? customColorValue : undefined,
    style:
      styleValue === "solid" ||
      styleValue === "light" ||
      styleValue === "translucent" ||
      styleValue === "plain"
        ? styleValue
        : "outline",
    size: asNumber(stored.size ?? slideSettings.fontSize, defaults.size),
    position:
      positionValue === "top" || positionValue === "bottom"
        ? positionValue
        : "center",
    width: asNumber(stored.width ?? slideSettings.textWidth, defaults.width),
    align:
      alignValue === "left" || alignValue === "right" ? alignValue : "center",
    padding: paddingValue === "flush" ? "flush" : "padded",
    backgroundRadius: Math.max(
      0,
      Math.min(20, asNumber(stored.backgroundRadius, defaults.backgroundRadius)),
    ),
  };
}

export function readPhaseSettingsFromProject(
  project: JsonRecord,
  settings: JsonRecord,
): Record<SlideshowSlideKind, SlideshowKindSettings> {
  const overlay = isRecord(settings.darkOverlay) ? settings.darkOverlay : {};
  const fallback: SlideshowKindSettings = {
    ...defaultKindSettings(),
    grid: normalizeGrid(settings.imageGrid),
    overlayEnabled: asBoolean(overlay.enabled, true),
    overlayOpacity: asNumber(overlay.opacity, 45),
    displayText: asBoolean(settings.displayText, true),
  };
  const stored = project.phaseSettings ?? settings.phaseSettings;
  return canonicalizePhaseSettings(stored, fallback);
}
