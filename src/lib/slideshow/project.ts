import { formatGenerationPromptForEditing } from "@/lib/ai/prompt-presentation";
import type { SlideshowAestheticTemplate } from "@/lib/ai/slideshow-creator-types";
import {
  DEFAULT_PROJECT_LAYOUT,
  DEFAULT_PROJECT_SETTINGS,
  MAX_SLIDES_PER_PROJECT,
  type SlideshowProjectStatusValue,
  type SlideshowSlideKindValue,
} from "@/lib/slideshow/constants";
import {
  asBoolean,
  asDateHistory,
  asNonNegativeInteger,
  asString,
  canonicalizePhaseSettings,
  defaultTextSettings,
  isRecord,
  normalizeAspectRatio,
  normalizeStatus,
  readPhaseSettingsFromProject,
  readTextSettings,
  slideshowTextColorHex,
  stringList,
} from "@/lib/slideshow/project-settings";

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

const SERVER_OWNED_STATUSES = ["generating", "exported", "failed"] as const;

export {
  canonicalizePhaseSettings,
  slideshowTextColorHex,
  slideshowTextColorToken,
} from "@/lib/slideshow/project-settings";

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
