import { formatGenerationPromptForEditing } from "@/lib/ai/prompt-presentation";
import type { SlideshowAestheticTemplate } from "@/lib/ai/slideshow-creator-types";
import {
  DEFAULT_PROJECT_LAYOUT,
  DEFAULT_PROJECT_SETTINGS,
  MAX_SLIDES_PER_PROJECT,
  SLIDESHOW_PROJECT_STATUSES,
  SLIDESHOW_SLIDE_KINDS,
  type SlideshowProjectStatusValue,
  type SlideshowSlideKindValue,
} from "@/lib/slideshow/constants";
import { slideshowOverlayTextColor } from "@/lib/slideshow/text-overlay";

export const SLIDESHOW_SLIDE_KINDS_CANONICAL = SLIDESHOW_SLIDE_KINDS;
export type SlideshowSlideKind = SlideshowSlideKindValue;
export type SlideshowProjectStatus = SlideshowProjectStatusValue;
export type SlideshowAspectRatio = "9:16" | "4:5" | "1:1" | "16:9";
export type SlideshowGrid = "none" | "1:2" | "1:3" | "2:1" | "2:2";
export type SlideshowTextStyle =
  | "outline"
  | "solid"
  | "light"
  | "translucent"
  | "plain";
export type SlideshowTextPosition = "top" | "center" | "bottom";
export type SlideshowTextAlign = "left" | "center" | "right";
export type SlideshowTextColorToken =
  | "white"
  | "black"
  | "coral"
  | "blue"
  | "yellow"
  | "custom";

export type SlideshowSlide = {
  id: string;
  clientId?: string;
  order: number;
  kind: SlideshowSlideKind;
  eyebrow: string;
  headline: string;
  body: string;
  prompt: string;
  visualKey: string;
  visualKeys?: string[];
  imageUrl?: string | null;
  imageUrls?: string[];
};

export type SlideshowKindSettings = {
  grid: SlideshowGrid;
  overlayEnabled: boolean;
  overlayOpacity: number;
  displayText: boolean;
};

export type SlideshowTextSettings = {
  font:
    | "Poppins"
    | "Inter"
    | "Serif"
    | "SerifItalic"
    | "Editorial"
    | "Condensed"
    | "Mono"
    | "Rounded";
  color: SlideshowTextColorToken;
  customColor?: string;
  style: SlideshowTextStyle;
  size: number;
  position: SlideshowTextPosition;
  width: number;
  align: SlideshowTextAlign;
  padding: "padded" | "flush";
  backgroundRadius: number;
};

export type SlideshowProject = {
  id: string;
  clientId?: string;
  title: string;
  description?: string;
  caption?: string;
  generationProvider?: "ollama" | "local-fallback";
  generationModel?: string | null;
  generationWarning?: string;
  status: SlideshowProjectStatus;
  revision?: number;
  aspectRatio: SlideshowAspectRatio;
  slides: SlideshowSlide[];
  phaseSettings: Record<SlideshowSlideKind, SlideshowKindSettings>;
  textSettings: SlideshowTextSettings;
  includeCta: boolean;
  preventRepeats: boolean;
  language: string;
  templateId?: string | null;
  creator?: {
    template?: SlideshowAestheticTemplate | null;
    updatedAt?: string;
  } | null;
  successfulExportCount?: number;
  lastExportedAt?: string | null;
  exportHistory?: string[];
  createdAt?: string;
  updatedAt: string;
};

type JsonRecord = Record<string, unknown>;

const SERVER_OWNED_STATUSES = ["generating", "exported", "failed"] as const;
const LEGACY_CORAL_HEX = "#ff7a59";
const LEGACY_BLUE_HEX = "#4f9fd9";

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asNonNegativeInteger(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

function asDateHistory(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && Number.isFinite(Date.parse(item)),
      )
    : [];
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

export function isLocalSlideshowId(id: string) {
  return id.startsWith("local-");
}

export function isServerOwnedSlideshowStatus(status: SlideshowProjectStatus) {
  return (SERVER_OWNED_STATUSES as readonly string[]).includes(status);
}

export function slideKindFromUnknown(
  value: unknown,
  fallback: SlideshowSlideKind = "hook",
): SlideshowSlideKind {
  if (value === "cta" || value === "hook" || value === "content") return value;
  if (value === "body") return "content";
  return fallback;
}

export function slideKindFromStoryRole(role: unknown): SlideshowSlideKind {
  return slideKindFromUnknown(role, "content");
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

function normalizeGrid(value: unknown): SlideshowGrid {
  return value === "1:2" ||
    value === "1:3" ||
    value === "2:1" ||
    value === "2:2"
    ? value
    : "none";
}

function normalizeAspectRatio(value: unknown): SlideshowAspectRatio {
  return value === "4:5" || value === "1:1" || value === "16:9"
    ? value
    : "9:16";
}

function normalizeStatus(value: unknown): SlideshowProjectStatus {
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

function defaultKindSettings(): SlideshowKindSettings {
  const hook = DEFAULT_PROJECT_SETTINGS.phaseSettings.hook;
  return {
    grid: normalizeGrid(hook.grid),
    overlayEnabled: hook.overlayEnabled,
    overlayOpacity: hook.overlayOpacity,
    displayText: hook.displayText,
  };
}

function defaultTextSettings(): SlideshowTextSettings {
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

function readTextSettings(
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

function readPhaseSettingsFromProject(
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

function parseSlide(value: unknown, index: number): SlideshowSlide {
  const slide = isRecord(value) ? value : {};
  const content = isRecord(slide.content) ? slide.content : {};
  const textItems = Array.isArray(content.textItems)
    ? content.textItems.filter(isRecord)
    : [];
  const byLayer = (layer: string, fallbackIndex: number) =>
    asString(
      textItems.find((item) => item.role === layer)?.text ??
        textItems[fallbackIndex]?.text,
    );

  return {
    id: asString(slide.id, `local-slide-api-${index + 1}`),
    clientId: asString(content.clientId) || undefined,
    order:
      typeof slide.position === "number"
        ? slide.position
        : typeof slide.order === "number"
          ? slide.order
          : index,
    kind: slideKindFromUnknown(slide.kind ?? slide.role),
    eyebrow: asString(slide.eyebrow ?? content.eyebrow, byLayer("eyebrow", 0)),
    headline: asString(
      slide.headline ?? content.headline,
      byLayer("headline", 1),
    ),
    body: asString(slide.body ?? content.body, byLayer("body", 2)),
    prompt: formatGenerationPromptForEditing(
      asString(slide.prompt ?? slide.imagePrompt ?? content.prompt),
    ),
    visualKey: asString(
      slide.visualKey ?? content.visualKey,
      "coral-glow",
    ),
    visualKeys: stringList(slide.visualKeys ?? content.visualKeys),
    imageUrl:
      slide.imageUrl === undefined
        ? null
        : typeof slide.imageUrl === "string"
          ? slide.imageUrl
          : null,
    imageUrls: stringList(slide.imageUrls ?? content.imageUrls),
  };
}

function blankSlideshowProject(): SlideshowProject {
  const now = new Date(0).toISOString();
  return {
    id: "local-slideshow",
    title: "Untitled slideshow",
    status: "draft",
    aspectRatio: "9:16",
    slides: [
      {
        id: "local-slide-1",
        order: 0,
        kind: "hook",
        eyebrow: "",
        headline: "",
        body: "",
        prompt: "",
        visualKey: "coral-glow",
      },
    ],
    phaseSettings: canonicalizePhaseSettings(
      DEFAULT_PROJECT_SETTINGS.phaseSettings,
    ),
    textSettings: defaultTextSettings(),
    includeCta: true,
    preventRepeats: true,
    language: "English",
    templateId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function parseSlideshowProject(input: unknown): SlideshowProject {
  const project = isRecord(input) ? input : {};
  const settings = isRecord(project.settings) ? project.settings : {};
  const layout = isRecord(project.layout) ? project.layout : {};
  const rawSlides = Array.isArray(project.slides) ? project.slides : [];
  const fallback = blankSlideshowProject();
  const slides = rawSlides.length
    ? rawSlides.map(parseSlide).sort((a, b) => a.order - b.order)
    : fallback.slides;
  const includeCta = asBoolean(
    project.includeCta ?? settings.includeCta,
    slides.some((slide) => slide.kind === "cta"),
  );
  const exportHistory = asDateHistory(
    project.exportHistory ?? settings.exportHistory,
  );
  const creatorSource = isRecord(project.creator)
    ? project.creator
    : isRecord(settings.creator)
      ? settings.creator
      : null;

  return {
    id: asString(project.id, fallback.id),
    clientId: asString(project.clientId ?? settings.clientId) || undefined,
    title: asString(project.title, fallback.title),
    description:
      typeof project.description === "string" ? project.description : undefined,
    caption: asString(project.caption ?? settings.caption) || undefined,
    generationProvider:
      project.generationProvider === "ollama" ||
      project.generationProvider === "local-fallback"
        ? project.generationProvider
        : settings.generationProvider === "ollama" ||
            settings.generationProvider === "local-fallback"
          ? settings.generationProvider
          : undefined,
    generationModel:
      typeof project.generationModel === "string"
        ? project.generationModel
        : typeof settings.generationModel === "string"
          ? settings.generationModel
          : null,
    generationWarning:
      asString(project.generationWarning ?? settings.generationWarning) ||
      undefined,
    status: normalizeStatus(project.status),
    revision:
      typeof project.revision === "number" ? project.revision : undefined,
    aspectRatio: normalizeAspectRatio(
      project.aspectRatio ?? settings.aspectRatio ?? layout.aspectRatio,
    ),
    slides: slides.slice(0, MAX_SLIDES_PER_PROJECT),
    phaseSettings: readPhaseSettingsFromProject(project, settings),
    textSettings: readTextSettings(settings, isRecord(rawSlides[0]) ? rawSlides[0] : undefined),
    includeCta,
    preventRepeats: asBoolean(
      project.preventRepeats ?? settings.preventRepeats,
      true,
    ),
    language: asString(project.language ?? settings.language, "English"),
    templateId: asString(project.templateId ?? settings.templateId) || null,
    creator:
      creatorSource && isRecord(creatorSource.template)
        ? {
            template: creatorSource.template as unknown as SlideshowAestheticTemplate,
            updatedAt:
              typeof creatorSource.updatedAt === "string"
                ? creatorSource.updatedAt
                : undefined,
          }
        : null,
    successfulExportCount: asNonNegativeInteger(
      project.successfulExportCount ?? settings.successfulExportCount,
      exportHistory.length,
    ),
    lastExportedAt:
      typeof (project.lastExportedAt ?? settings.lastExportedAt) === "string" &&
      Number.isFinite(Date.parse(asString(project.lastExportedAt ?? settings.lastExportedAt)))
        ? asString(project.lastExportedAt ?? settings.lastExportedAt)
        : exportHistory.at(-1) ?? null,
    exportHistory,
    createdAt: asString(project.createdAt) || undefined,
    updatedAt: asString(project.updatedAt, fallback.updatedAt),
  };
}

export function slideshowProjectWriteBody(project: SlideshowProject) {
  const contentSettings = project.phaseSettings.content;
  const hex = slideshowTextColorHex(project.textSettings);
  return {
    title: project.title.trim() || "Untitled slideshow",
    ...(project.description?.trim()
      ? { description: project.description.trim() }
      : {}),
    ...(isServerOwnedSlideshowStatus(project.status)
      ? {}
      : { status: project.status }),
    settings: {
      aspectRatio: project.aspectRatio,
      imageGrid: contentSettings.grid,
      darkOverlay: {
        enabled: contentSettings.overlayEnabled,
        opacity: contentSettings.overlayOpacity,
      },
      displayText: contentSettings.displayText,
      phaseSettings: project.phaseSettings,
      textSettings: project.textSettings,
      includeCta: project.includeCta,
      preventRepeats: project.preventRepeats,
      language: project.language,
      caption: project.caption ?? null,
      generationProvider: project.generationProvider ?? null,
      generationWarning: project.generationWarning ?? null,
      templateId: project.templateId ?? null,
      creator: project.creator?.template ? project.creator : null,
      clientId: project.clientId ?? project.id,
    },
    layout: {
      aspectRatio: project.aspectRatio,
      safeArea: DEFAULT_PROJECT_LAYOUT.safeArea,
    },
    slides: project.slides.map((slide, index) => ({
      ...(isLocalSlideshowId(slide.id) || slide.id.startsWith("local-slide-")
        ? {}
        : { id: slide.id }),
      position: index,
      kind: slide.kind,
      imageUrl: slide.imageUrl ?? null,
      imagePrompt: slide.prompt,
      content: {
        clientId: slide.clientId ?? slide.id,
        eyebrow: slide.eyebrow,
        headline: slide.headline,
        body: slide.body,
        prompt: slide.prompt,
        visualKey: slide.visualKey,
        visualKeys: slide.visualKeys,
        imageUrls: slide.imageUrls,
        textItems: [
          { id: `${slide.id}-eyebrow`, role: "eyebrow", text: slide.eyebrow },
          { id: `${slide.id}-headline`, role: "headline", text: slide.headline },
          { id: `${slide.id}-body`, role: "body", text: slide.body },
        ],
      },
      settings: {
        fontFamily: project.textSettings.font,
        fontSize: project.textSettings.size,
        textColor: hex,
        textStyle: project.textSettings.style,
        textAlign: project.textSettings.align,
        verticalPosition: project.textSettings.position,
        textWidth: project.textSettings.width,
        backgroundRadius: project.textSettings.backgroundRadius,
        padded: project.textSettings.padding === "padded",
      },
      layout: {
        text: {
          x: 50,
          y:
            project.textSettings.position === "top"
              ? 18
              : project.textSettings.position === "bottom"
                ? 82
                : 50,
          width: project.textSettings.width,
        },
      },
    })),
  };
}

export const deserializeSlideshowProject = parseSlideshowProject;
export const serializeSlideshowProject = slideshowProjectWriteBody;
