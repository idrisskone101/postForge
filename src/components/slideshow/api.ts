import {
  createBlankSlideshowProject,
  EMPTY_SLIDESHOW_ANALYTICS,
} from "./fixtures";
import { normalizeSlideshowSlides } from "./model";
import type {
  SlideshowAnalytics,
  SlideshowAutomation,
  SlideshowAspectRatio,
  SlideshowCollection,
  SlideshowGrid,
  PinterestImageCandidate,
  SlideshowPhase,
  SlideshowPhaseSettings,
  SlideshowProject,
  SlideshowProjectStatus,
  SlideshowSlide,
  SlideshowTextSettings,
} from "./types";
import { isLocalSlideshowId } from "./types";

type JsonRecord = Record<string, unknown>;

interface ApiTextItem {
  id?: string;
  text?: string;
  role?: string;
}

interface ApiSlide {
  id?: string;
  projectId?: string;
  position?: number;
  kind?: string;
  imageUrl?: string | null;
  imagePrompt?: string | null;
  content?: JsonRecord | null;
  settings?: JsonRecord | null;
  layout?: JsonRecord | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiProject {
  id?: string;
  title?: string;
  description?: string | null;
  status?: string;
  revision?: number;
  settings?: JsonRecord | null;
  layout?: JsonRecord | null;
  slides?: ApiSlide[];
  createdAt?: string;
  updatedAt?: string;
}

export class SlideshowApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SlideshowApiError";
    this.status = status;
    this.code = code;
  }
}

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
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
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

function isPinterestCandidateUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      url.hostname.toLowerCase() === "i.pinimg.com"
    );
  } catch {
    return false;
  }
}

function normalizeAspectRatio(value: unknown): SlideshowAspectRatio {
  return value === "4:5" || value === "1:1" || value === "16:9"
    ? value
    : "9:16";
}

function normalizeGrid(value: unknown): SlideshowGrid {
  return value === "1:2" ||
    value === "1:3" ||
    value === "2:1" ||
    value === "2:2"
    ? value
    : "none";
}

function normalizePhase(value: unknown): SlideshowPhase {
  if (value === "cta") return "cta";
  if (value === "content" || value === "body") return "body";
  return "hook";
}

function normalizeStatus(value: unknown): SlideshowProjectStatus {
  if (
    value === "generating" ||
    value === "ready" ||
    value === "scheduled" ||
    value === "published" ||
    value === "archived" ||
    value === "exported" ||
    value === "failed"
  ) {
    return value;
  }
  return "draft";
}

function readTextItems(content: JsonRecord) {
  const rawItems = Array.isArray(content.textItems) ? content.textItems : [];
  return rawItems.filter(isRecord) as ApiTextItem[];
}

function deserializeSlide(slide: ApiSlide, index: number): SlideshowSlide {
  const content = isRecord(slide.content) ? slide.content : {};
  const textItems = readTextItems(content);
  const byRole = (role: string, fallbackIndex: number) =>
    asString(
      textItems.find((item) => item.role === role)?.text ??
        textItems[fallbackIndex]?.text,
    );

  return {
    id: slide.id ?? `local-slide-api-${index + 1}`,
    clientId: asString(content.clientId) || undefined,
    order: typeof slide.position === "number" ? slide.position : index,
    role: normalizePhase(slide.kind),
    eyebrow: asString(content.eyebrow, byRole("eyebrow", 0)),
    headline: asString(content.headline, byRole("headline", 1)),
    body: asString(content.body, byRole("body", 2)),
    prompt: asString(slide.imagePrompt ?? content.prompt),
    visualKey: asString(content.visualKey, "coral-glow"),
    visualKeys: Array.isArray(content.visualKeys)
      ? content.visualKeys.filter((value): value is string => typeof value === "string")
      : undefined,
    imageUrl: slide.imageUrl ?? null,
    imageUrls: Array.isArray(content.imageUrls)
      ? content.imageUrls.filter((value): value is string => typeof value === "string")
      : undefined,
  };
}

function readPhaseSettings(
  settings: JsonRecord,
): Record<SlideshowPhase, SlideshowPhaseSettings> {
  const stored = isRecord(settings.phaseSettings) ? settings.phaseSettings : {};
  const overlay = isRecord(settings.darkOverlay) ? settings.darkOverlay : {};
  const fallback: SlideshowPhaseSettings = {
    grid: normalizeGrid(settings.imageGrid),
    overlayEnabled: asBoolean(overlay.enabled, true),
    overlayOpacity: asNumber(overlay.opacity, 45),
    displayText: asBoolean(settings.displayText, true),
  };

  const read = (phase: SlideshowPhase): SlideshowPhaseSettings => {
    const value = isRecord(stored[phase]) ? stored[phase] : {};
    return {
      grid: normalizeGrid(value.grid ?? fallback.grid),
      overlayEnabled: asBoolean(value.overlayEnabled, fallback.overlayEnabled),
      overlayOpacity: asNumber(value.overlayOpacity, fallback.overlayOpacity),
      displayText: asBoolean(value.displayText, fallback.displayText),
    };
  };

  return { hook: read("hook"), body: read("body"), cta: read("cta") };
}

function readTextSettings(
  settings: JsonRecord,
  firstSlide?: ApiSlide,
): SlideshowTextSettings {
  const stored = isRecord(settings.textSettings) ? settings.textSettings : {};
  const slideSettings = isRecord(firstSlide?.settings) ? firstSlide.settings : {};
  const font = asString(stored.font ?? slideSettings.fontFamily, "Poppins");
  const colorValue = asString(stored.color ?? slideSettings.textColor, "white");
  const customColorValue = asString(
    stored.customColor,
    /^#[0-9a-f]{3,8}$/i.test(colorValue) ? colorValue : "#ffffff",
  );
  const isCustomColor =
    colorValue === "custom" || /^#[0-9a-f]{3,8}$/i.test(colorValue);
  const styleValue = asString(stored.style ?? slideSettings.textStyle, "outline");
  const positionValue = asString(
    stored.position ?? slideSettings.verticalPosition,
    "center",
  );
  const alignValue = asString(stored.align ?? slideSettings.textAlign, "center");

  return {
    font:
      font === "Inter" ||
      font === "Serif" ||
      font === "Mono" ||
      font === "Rounded"
        ? font
        : "Poppins",
    color:
      colorValue === "#000" || colorValue === "black"
        ? "black"
        : colorValue === "coral" || colorValue === "#ff7a59"
          ? "coral"
          : colorValue === "blue" || colorValue === "#4f9fd9"
            ? "blue"
            : colorValue === "yellow"
              ? "yellow"
              : isCustomColor
                ? "custom"
                : "white",
    customColor: isCustomColor ? customColorValue : undefined,
    style:
      styleValue === "solid" ||
      styleValue === "translucent" ||
      styleValue === "plain"
        ? styleValue
        : "outline",
    size: asNumber(stored.size ?? slideSettings.fontSize, 28),
    position:
      positionValue === "top" || positionValue === "bottom"
        ? positionValue
        : "center",
    width: asNumber(stored.width ?? slideSettings.textWidth, 88),
    align:
      alignValue === "left" || alignValue === "right" ? alignValue : "center",
  };
}

export function deserializeSlideshowProject(input: unknown): SlideshowProject {
  const project = isRecord(input) ? (input as ApiProject) : {};
  const settings = isRecord(project.settings) ? project.settings : {};
  const layout = isRecord(project.layout) ? project.layout : {};
  const rawSlides = Array.isArray(project.slides) ? project.slides : [];
  const includeCta = asBoolean(
    settings.includeCta,
    rawSlides.some((slide) => normalizePhase(slide.kind) === "cta"),
  );
  const fallback = createBlankSlideshowProject();
  const exportHistory = asDateHistory(settings.exportHistory);
  const slides = rawSlides.length
    ? rawSlides
        .map(deserializeSlide)
        .sort((a, b) => a.order - b.order)
    : fallback.slides;

  return {
    id: project.id ?? fallback.id,
    clientId: asString(settings.clientId) || undefined,
    title: project.title ?? fallback.title,
    description: project.description ?? undefined,
    caption: asString(settings.caption) || undefined,
    generationProvider:
      settings.generationProvider === "gemini" ||
      settings.generationProvider === "local-fallback"
        ? settings.generationProvider
        : undefined,
    generationWarning: asString(settings.generationWarning) || undefined,
    status: normalizeStatus(project.status),
    revision: project.revision,
    aspectRatio: normalizeAspectRatio(
      settings.aspectRatio ?? layout.aspectRatio,
    ),
    slides: normalizeSlideshowSlides(slides, includeCta),
    phaseSettings: readPhaseSettings(settings),
    textSettings: readTextSettings(settings, rawSlides[0]),
    includeCta,
    preventRepeats: asBoolean(settings.preventRepeats, true),
    language: asString(settings.language, "English"),
    templateId: asString(settings.templateId) || null,
    successfulExportCount: asNonNegativeInteger(
      settings.successfulExportCount,
      exportHistory.length,
    ),
    lastExportedAt:
      typeof settings.lastExportedAt === "string" &&
      Number.isFinite(Date.parse(settings.lastExportedAt))
        ? settings.lastExportedAt
        : exportHistory.at(-1) ?? null,
    exportHistory,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt ?? new Date(0).toISOString(),
  };
}

const textColorMap: Record<SlideshowTextSettings["color"], string> = {
  white: "#fff",
  black: "#000",
  coral: "#ff7a59",
  blue: "#4f9fd9",
  yellow: "#f7e27d",
  custom: "#fff",
};

export function serializeSlideshowProject(project: SlideshowProject) {
  const bodySettings = project.phaseSettings.body;
  return {
    title: project.title.trim() || "Untitled slideshow",
    ...(project.description?.trim()
      ? { description: project.description.trim() }
      : {}),
    status:
      project.status === "generating" ||
      project.status === "exported" ||
      project.status === "failed"
        ? "draft"
        : project.status,
    settings: {
      aspectRatio: project.aspectRatio,
      imageGrid: bodySettings.grid,
      darkOverlay: {
        enabled: bodySettings.overlayEnabled,
        opacity: bodySettings.overlayOpacity,
      },
      displayText: bodySettings.displayText,
      phaseSettings: project.phaseSettings,
      textSettings: project.textSettings,
      includeCta: project.includeCta,
      preventRepeats: project.preventRepeats,
      language: project.language,
      caption: project.caption ?? null,
      generationProvider: project.generationProvider ?? null,
      generationWarning: project.generationWarning ?? null,
      templateId: project.templateId ?? null,
      clientId: project.clientId ?? project.id,
    },
    layout: {
      aspectRatio: project.aspectRatio,
      safeArea: { top: 8, right: 8, bottom: 8, left: 8 },
    },
    slides: project.slides.map((slide, index) => ({
      ...(isLocalSlideshowId(slide.id) || slide.id.startsWith("local-slide-")
        ? {}
        : { id: slide.id }),
      position: index,
      kind: slide.role === "body" ? "content" : slide.role,
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
        textColor:
          project.textSettings.color === "custom"
            ? (project.textSettings.customColor ?? "#fff")
            : textColorMap[project.textSettings.color],
        textStyle: project.textSettings.style,
        textAlign: project.textSettings.align,
        verticalPosition: project.textSettings.position,
        textWidth: project.textSettings.width,
        padded:
          project.textSettings.style === "solid" ||
          project.textSettings.style === "translucent",
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

async function readJsonResponse(response: Response) {
  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const record = isRecord(data) ? data : {};
    throw new SlideshowApiError(
      asString(record.error, `Request failed (${response.status})`),
      response.status,
      asString(record.code) || undefined,
    );
  }
  return data;
}

function unwrapProject(data: unknown) {
  if (isRecord(data) && isRecord(data.project)) return data.project;
  return data;
}

const SLIDESHOW_PAGE_LIMIT = 100;

function paginatedUrl(endpoint: string, offset: number) {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}limit=${SLIDESHOW_PAGE_LIMIT}&offset=${offset}`;
}

async function fetchAllSlideshowPages(
  endpoint: string,
  collectionKey: "projects" | "automations",
) {
  const items: unknown[] = [];
  let total: number | null = null;

  for (let offset = 0; total === null || offset < total; offset += SLIDESHOW_PAGE_LIMIT) {
    const response = await fetch(paginatedUrl(endpoint, offset), {
      cache: "no-store",
    });
    const data = await readJsonResponse(response);
    const page =
      isRecord(data) && Array.isArray(data[collectionKey])
        ? data[collectionKey]
        : [];

    if (total === null) {
      const reportedTotal = isRecord(data) ? data.total : undefined;
      if (
        typeof reportedTotal !== "number" ||
        !Number.isSafeInteger(reportedTotal) ||
        reportedTotal < 0
      ) {
        throw new SlideshowApiError(
          "Invalid slideshow pagination response",
          502,
          "INVALID_PAGINATION",
        );
      }
      total = reportedTotal;
    }

    items.push(...page);

    // A trusted endpoint should return every requested page until `total` is
    // reached. Stop safely if records were concurrently removed between pages.
    if (page.length === 0) break;
  }

  return items;
}

export async function fetchSlideshowProjects(apiBaseUrl = "/api/slideshows") {
  const rawProjects = await fetchAllSlideshowPages(apiBaseUrl, "projects");
  return rawProjects.map(deserializeSlideshowProject);
}

export async function persistSlideshowProject(
  project: SlideshowProject,
  apiBaseUrl = "/api/slideshows",
) {
  const creating = isLocalSlideshowId(project.id);
  const response = await fetch(
    creating ? apiBaseUrl : `${apiBaseUrl}/${encodeURIComponent(project.id)}`,
    {
      method: creating ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(!creating ? { revision: project.revision ?? 0 } : {}),
        ...serializeSlideshowProject(project),
      }),
    },
  );
  return deserializeSlideshowProject(unwrapProject(await readJsonResponse(response)));
}

export async function requestSlideshowCopyVariation(
  project: SlideshowProject,
  slide: SlideshowSlide,
  apiBaseUrl = "/api/slideshows",
): Promise<Partial<SlideshowSlide>> {
  const response = await fetch(`${apiBaseUrl}/generate-story`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idea: `${slide.prompt}\nCurrent slide: ${slide.headline}`,
      slideCount: 1,
      language: project.language,
      tone: "specific, conversational, concise",
    }),
  });
  const data = await readJsonResponse(response);
  const story = isRecord(data) && isRecord(data.story) ? data.story : {};
  const generatedSlides = Array.isArray(story.slides) ? story.slides : [];
  const generated = generatedSlides.find(isRecord) ?? {};
  const content = isRecord(generated.content) ? generated.content : generated;
  const textItems = readTextItems(content);

  return {
    eyebrow: asString(content.eyebrow, textItems[0]?.text ?? slide.eyebrow),
    headline: asString(
      content.headline ?? content.heading,
      textItems[1]?.text ?? slide.headline,
    ),
    body: asString(content.body, textItems[2]?.text ?? slide.body),
    prompt: asString(generated.imagePrompt, slide.prompt),
  };
}

export async function requestSlideshowStory(
  input: {
    idea: string;
    slideCount: number;
    language: string;
    includeCta: boolean;
  },
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowProject> {
  const response = await fetch(`${apiBaseUrl}/generate-story`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse(response);
  const responseRecord = isRecord(data) ? data : {};
  const story = isRecord(data) && isRecord(data.story) ? data.story : {};
  const generated = Array.isArray(story.slides)
    ? story.slides.filter(isRecord)
    : [];
  if (!generated.length) {
    throw new SlideshowApiError("Story generation returned no slides.", 500);
  }

  const now = new Date().toISOString();
  const localId = `local-${Date.now()}`;
  const base = createBlankSlideshowProject();
  const visualKeys = [
    "coral-glow",
    "blue-studio",
    "lime-paper",
    "violet-dusk",
    "mint-room",
    "paper-stack",
    "sunset-blocks",
    "night-grid",
  ];
  const slides = generated.map((raw, index): SlideshowSlide => {
    const content = isRecord(raw.content) ? raw.content : raw;
    const role = normalizePhase(raw.role ?? raw.kind);
    const id = `local-slide-${localId}-${index + 1}`;
    return {
      id,
      clientId: id,
      order: index,
      role,
      eyebrow: asString(
        content.eyebrow,
        role === "hook" ? "START HERE" : role === "cta" ? "NEXT STEP" : `POINT ${index}`,
      ),
      headline: asString(content.headline ?? content.heading, `Slide ${index + 1}`),
      body: asString(content.body),
      prompt: asString(raw.imagePrompt ?? content.imagePrompt),
      visualKey: visualKeys[index % visualKeys.length],
    };
  });
  const includeCta = slides.some((slide) => slide.role === "cta");

  return {
    ...base,
    id: localId,
    clientId: localId,
    title: asString(story.title, input.idea).slice(0, 160),
    description: input.idea,
    caption: asString(story.caption) || undefined,
    generationProvider:
      responseRecord.provider === "gemini" ? "gemini" : "local-fallback",
    generationWarning: asString(responseRecord.warning) || undefined,
    slides: normalizeSlideshowSlides(slides, includeCta),
    includeCta,
    language: input.language,
    templateId: null,
    createdAt: now,
    updatedAt: now,
  };
}

interface SlideshowImageJob {
  status?: string;
  error?: string | null;
  outputs?: Array<{ id?: string; url?: string }>;
  slideshow?: {
    projectRevision?: number;
    imageUrl?: string | null;
    generatedFileId?: string | null;
  } | null;
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function requestSlideshowImageGeneration(
  project: SlideshowProject,
  slide: SlideshowSlide,
  apiBaseUrl = "/api/slideshows",
  onQueuedRevision?: (revision: number) => void,
) {
  if (isLocalSlideshowId(project.id) || slide.id.startsWith("local-slide-")) {
    throw new SlideshowApiError(
      "Wait for the draft to finish saving before generating an image.",
      409,
    );
  }

  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(project.id)}/slides/${encodeURIComponent(slide.id)}/generate-image`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: project.revision ?? 0,
        prompt: slide.prompt,
      }),
    },
  );
  const data = await readJsonResponse(response);
  const record = isRecord(data) ? data : {};
  const jobId = asString(record.jobId ?? record.id);
  const statusUrl = asString(record.statusUrl);
  const projectRevision = asNumber(record.projectRevision, project.revision ?? 0);
  onQueuedRevision?.(projectRevision);
  if (!jobId) {
    throw new SlideshowApiError("Image generation did not return a job id.", 500);
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (attempt > 0) await delay(1800);
    const jobResponse = await fetch(
      statusUrl || `/api/jobs/${encodeURIComponent(jobId)}`,
      {
      cache: "no-store",
      },
    );
    const jobData = (await readJsonResponse(jobResponse)) as SlideshowImageJob;
    if (jobData.status === "failed") {
      throw new SlideshowApiError(
        jobData.error || "Image generation failed.",
        500,
      );
    }
    if (jobData.status === "completed") {
      const output = jobData.outputs?.[0];
      const completedRevision = asNumber(
        jobData.slideshow?.projectRevision,
        projectRevision,
      );
      const completedImageUrl = jobData.slideshow?.imageUrl ?? output?.url;
      const completedFileId =
        jobData.slideshow?.generatedFileId ?? output?.id;
      if (!completedFileId && !completedImageUrl) {
        throw new SlideshowApiError(
          "Image generation completed without an output.",
          500,
        );
      }
      return {
        imageUrl:
          completedImageUrl ?? `/api/files/${completedFileId}`,
        generatedFileId: completedFileId ?? undefined,
        projectRevision: completedRevision,
      };
    }
  }

  throw new SlideshowApiError(
    "Image generation is taking longer than expected. Try again shortly.",
    408,
  );
}

function fileNameFromDisposition(value: string | null, fallback: string) {
  const match = value?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

export async function downloadSlideshowExport(
  project: SlideshowProject,
  apiBaseUrl = "/api/slideshows",
  format: "photo-carousel" | "mp4" = "photo-carousel",
  caption = project.caption ?? "",
) {
  if (isLocalSlideshowId(project.id)) {
    throw new SlideshowApiError(
      "Wait for the draft to finish saving before exporting.",
      409,
    );
  }

  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(project.id)}/export`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: format === "mp4" ? "video" : "carousel",
        secondsPerSlide: 2.5,
        caption,
      }),
    },
  );
  if (!response.ok) {
    await readJsonResponse(response);
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileNameFromDisposition(
    response.headers.get("content-disposition"),
    `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "slideshow"}.${
      format === "mp4" ? "mp4" : "zip"
    }`,
  );
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

  if (format === "mp4" && caption.trim()) {
    const captionUrl = URL.createObjectURL(
      new Blob([`${caption.trim()}\n`], { type: "text/plain;charset=utf-8" }),
    );
    const captionAnchor = document.createElement("a");
    captionAnchor.href = captionUrl;
    captionAnchor.download = `${
      project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "slideshow"
    }-caption.txt`;
    document.body.append(captionAnchor);
    captionAnchor.click();
    captionAnchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(captionUrl), 1_000);
  }

  const exportedAt = response.headers.get("x-postforge-exported-at");
  const count = Number(response.headers.get("x-postforge-export-count"));
  return {
    successfulExportCount:
      Number.isSafeInteger(count) && count >= 0
        ? count
        : (project.successfulExportCount ?? 0) + 1,
    exportedAt:
      exportedAt && Number.isFinite(Date.parse(exportedAt))
        ? exportedAt
        : new Date().toISOString(),
  };
}

export function deriveSlideshowAnalytics(
  projects: SlideshowProject[],
  automations: SlideshowAutomation[] = [],
  now = new Date(),
): SlideshowAnalytics {
  const dayCount = EMPTY_SLIDESHOW_ANALYTICS.dailyActivity.length;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (dayCount - 1));
  const dayKey = (value: Date) =>
    `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
  const buckets = new Map<string, number>();
  for (let index = 0; index < dayCount; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    buckets.set(dayKey(day), index);
  }
  const dailyActivity = Array.from({ length: dayCount }, () => 0);
  const recordActivity = (value: string | undefined | null) => {
    if (!value) return;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return;
    const index = buckets.get(dayKey(date));
    if (index !== undefined) dailyActivity[index] += 1;
  };

  for (const project of projects) {
    recordActivity(project.createdAt);
    for (const exportedAt of project.exportHistory ?? []) {
      recordActivity(exportedAt);
    }
  }
  for (const automation of automations) {
    const runHistory = automation.runHistory ?? [];
    if (runHistory.length) {
      for (const ranAt of runHistory) recordActivity(ranAt);
    } else {
      // Pre-activity-metadata runs already have a server-owned lastRunAt.
      recordActivity(automation.lastRunAt);
    }
  }

  return {
    draftProjects: projects.filter((project) => project.status === "draft").length,
    successfulExports: projects.reduce(
      (total, project) => total + (project.successfulExportCount ?? 0),
      0,
    ),
    activeAutomations: automations.filter(
      (automation) => automation.status === "active",
    ).length,
    successfulAutomationRuns: automations.reduce(
      (total, automation) =>
        total +
        (automation.successfulRunCount ?? (automation.lastRunAt ? 1 : 0)),
      0,
    ),
    dailyActivity,
  };
}

export async function fetchSlideshowAutomations(
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowAutomation[]> {
  const items = await fetchAllSlideshowPages(
    `${apiBaseUrl}/automations`,
    "automations",
  );
  return items
    .filter(isRecord)
    .map((item) => deserializeAutomation(item));
}

function deserializeAutomation(
  item: JsonRecord,
  fallback?: SlideshowAutomation,
): SlideshowAutomation {
  const schedule = isRecord(item.schedule) ? item.schedule : {};
  const contentSettings = isRecord(item.contentSettings)
    ? item.contentSettings
    : {};
  const weekdays = Array.isArray(schedule.weekdays)
    ? schedule.weekdays.filter(
        (value): value is string => typeof value === "string",
      )
    : fallback?.weekdays;
  const hooks = Array.isArray(contentSettings.hooks)
    ? contentSettings.hooks.filter(
        (value): value is string => typeof value === "string",
      )
    : fallback?.hooks;
  const runHistory = asDateHistory(contentSettings.runHistory);

  return {
    id: asString(item.id, fallback?.id ?? ""),
    name: asString(item.name, fallback?.name ?? "Untitled automation"),
    cadence: asString(
      item.cadence,
      asString(schedule.cadence, fallback?.cadence ?? "Custom schedule"),
    ),
    status:
      item.status === "active" || item.status === "archived"
        ? item.status
        : item.status === "paused"
          ? "paused"
          : fallback?.status ?? "paused",
    revision: asNumber(item.revision, fallback?.revision ?? 0),
    nextRunAt:
      typeof item.nextRunAt === "string"
        ? item.nextRunAt
        : item.nextRunAt === null
          ? null
          : fallback?.nextRunAt ?? null,
    projectId:
      typeof item.projectId === "string"
        ? item.projectId
        : item.projectId === null
          ? null
          : fallback?.projectId ?? null,
    visualKey: fallback?.visualKey ?? "coral-glow",
    hooks,
    weekdays,
    time: asString(schedule.time, fallback?.time ?? "") || undefined,
    timezone:
      asString(schedule.timezone, fallback?.timezone ?? "") || undefined,
    visualPolicy:
      contentSettings.visualPolicy === "fresh-ai"
        ? "fresh-ai"
        : contentSettings.visualPolicy === "reuse"
          ? "reuse"
          : fallback?.visualPolicy ?? "reuse",
    imageCollectionId:
      typeof contentSettings.imageCollectionId === "string"
        ? contentSettings.imageCollectionId
        : fallback?.imageCollectionId ?? null,
    imageModel:
      asString(contentSettings.imageModel, fallback?.imageModel ?? "") ||
      "nano-banana-2",
    successfulRunCount: asNonNegativeInteger(
      contentSettings.successfulRunCount,
      runHistory.length || (typeof item.lastRunAt === "string" ? 1 : 0),
    ),
    lastRunAt:
      typeof item.lastRunAt === "string" &&
      Number.isFinite(Date.parse(item.lastRunAt))
        ? item.lastRunAt
        : fallback?.lastRunAt ?? null,
    runHistory,
  };
}

function serializeAutomationSchedule(automation: SlideshowAutomation) {
  return {
    cadence: automation.cadence,
    ...(automation.weekdays?.length
      ? { weekdays: automation.weekdays }
      : {}),
    ...(automation.time ? { time: automation.time } : {}),
    timezone:
      automation.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function serializeAutomationContentSettings(automation: SlideshowAutomation) {
  const visualPolicy =
    automation.visualPolicy === "fresh-ai" ? "fresh-ai" : "reuse";
  return {
    preventRepeats: true,
    hooks: automation.hooks ?? [],
    visualPolicy,
    imageModel: automation.imageModel || "nano-banana-2",
    ...(visualPolicy === "reuse" && automation.imageCollectionId
      ? { imageCollectionId: automation.imageCollectionId }
      : {}),
  };
}

export async function createSlideshowAutomation(
  automation: SlideshowAutomation,
  apiBaseUrl = "/api/slideshows",
) {
  const response = await fetch(`${apiBaseUrl}/automations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: automation.name,
      projectId:
        automation.projectId && !isLocalSlideshowId(automation.projectId)
          ? automation.projectId
          : null,
      status: automation.status,
      schedule: serializeAutomationSchedule(automation),
      contentSettings: serializeAutomationContentSettings(automation),
      publishSettings: { mode: "draft" },
      nextRunAt: automation.nextRunAt ?? null,
    }),
  });
  const item = unwrapProject(await readJsonResponse(response));
  if (!isRecord(item)) return automation;
  return deserializeAutomation(item, automation);
}

export async function updateSlideshowAutomation(
  automation: SlideshowAutomation,
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowAutomation> {
  if (automation.id.startsWith("local-")) return automation;
  const response = await fetch(
    `${apiBaseUrl}/automations/${encodeURIComponent(automation.id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: automation.revision ?? 0,
        name: automation.name,
        projectId:
          automation.projectId && !isLocalSlideshowId(automation.projectId)
            ? automation.projectId
            : null,
        status: automation.status,
        schedule: serializeAutomationSchedule(automation),
        contentSettings: serializeAutomationContentSettings(automation),
        publishSettings: { mode: "draft" },
      }),
    },
  );
  const item = await readJsonResponse(response);
  return isRecord(item) ? deserializeAutomation(item, automation) : automation;
}

export async function deleteSlideshowAutomation(
  automation: SlideshowAutomation,
  apiBaseUrl = "/api/slideshows",
) {
  if (automation.id.startsWith("local-")) return;
  const response = await fetch(
    `${apiBaseUrl}/automations/${encodeURIComponent(automation.id)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: automation.revision ?? 0 }),
    },
  );
  if (!response.ok) await readJsonResponse(response);
}

export async function updateSlideshowAutomationStatus(
  automation: SlideshowAutomation,
  status: "active" | "paused",
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowAutomation> {
  if (automation.id.startsWith("local-")) return { ...automation, status };
  const response = await fetch(
    `${apiBaseUrl}/automations/${encodeURIComponent(automation.id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: automation.revision ?? 0, status }),
    },
  );
  const item = await readJsonResponse(response);
  if (!isRecord(item)) return { ...automation, status };
  return deserializeAutomation(item, automation);
}

function deserializeCollection(input: unknown): SlideshowCollection | null {
  if (!isRecord(input)) return null;
  const settings = isRecord(input.settings) ? input.settings : {};
  const images = Array.isArray(input.images) ? input.images.filter(isRecord) : [];
  const visualKeys = Array.isArray(input.visualKeys)
    ? input.visualKeys.filter((value): value is string => typeof value === "string")
    : Array.isArray(settings.visualKeys)
      ? settings.visualKeys.filter((value): value is string => typeof value === "string")
      : images.map((image, index) => asString(image.visualKey, `image-${index + 1}`));
  const imageUrls = images
    .map((image) => asString(image.url))
    .filter((value): value is string => Boolean(value));
  const sourceUrls = Array.isArray(settings.sourceUrls)
    ? settings.sourceUrls.filter((value): value is string => typeof value === "string")
    : undefined;
  return {
    id: asString(input.id, `local-collection-${Date.now()}`),
    name: asString(input.name ?? input.title, "Untitled collection"),
    imageCount: Math.max(
      asNumber(input.imageCount, 0),
      visualKeys.length,
      imageUrls.length,
      sourceUrls?.length ?? 0,
    ),
    visualKeys,
    imageUrls,
    sourceUrls,
    revision: asNumber(input.revision, 0),
  };
}

export async function fetchSlideshowCollections(
  apiBaseUrl = "/api/slideshows",
) {
  const response = await fetch(`${apiBaseUrl}/image-collections?limit=100`, {
    cache: "no-store",
  });
  const data = await readJsonResponse(response);
  const items = isRecord(data) && Array.isArray(data.collections) ? data.collections : [];
  return items.map(deserializeCollection).filter(Boolean) as SlideshowCollection[];
}

export async function createSlideshowCollection(
  collection: SlideshowCollection,
  apiBaseUrl = "/api/slideshows",
) {
  const response = await fetch(`${apiBaseUrl}/image-collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: collection.name,
      source: collection.sourceUrls?.length ? "pinterest-url" : "upload",
      settings: {
        visualKeys: collection.visualKeys,
        sourceUrls: collection.sourceUrls ?? [],
      },
      images: (collection.imageUrls ?? []).filter((url) => /^https?:\/\//.test(url)).map(
        (url, index) => ({
          url,
          altText: collection.name,
          metadata: {
            visualKey: collection.visualKeys[index] ?? `image-${index + 1}`,
            sourceUrl: collection.sourceUrls?.[index],
          },
        }),
      ),
    }),
  });
  return deserializeCollection(await readJsonResponse(response)) ?? collection;
}

export async function renameSlideshowCollection(
  collection: SlideshowCollection,
  name: string,
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowCollection> {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new SlideshowApiError("Collection name is required.", 400);
  }
  if (collection.id.startsWith("local-")) {
    return { ...collection, name: normalizedName };
  }
  const response = await fetch(
    `${apiBaseUrl}/image-collections/${encodeURIComponent(collection.id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revision: collection.revision ?? 0,
        name: normalizedName,
      }),
    },
  );
  return (
    deserializeCollection(await readJsonResponse(response)) ?? {
      ...collection,
      name: normalizedName,
    }
  );
}

export async function deleteSlideshowCollection(
  collection: SlideshowCollection,
  apiBaseUrl = "/api/slideshows",
) {
  if (collection.id.startsWith("local-")) return;
  const response = await fetch(
    `${apiBaseUrl}/image-collections/${encodeURIComponent(collection.id)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: collection.revision ?? 0 }),
    },
  );
  if (!response.ok) await readJsonResponse(response);
}

export async function fetchPinterestImageCandidates(
  input: { source: "search" | "board"; query: string },
  apiBaseUrl = "/api/slideshows",
) {
  const response = await fetch(`${apiBaseUrl}/pinterest/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readJsonResponse(response);
  const record = isRecord(data) ? data : {};
  const candidates = Array.isArray(record.candidates)
    ? record.candidates
        .filter(isRecord)
        .map((candidate) => ({
          id: asString(candidate.id),
          imageUrl: asString(candidate.imageUrl),
          sourceUrl: asString(candidate.sourceUrl),
        }))
        .filter(
          (candidate): candidate is PinterestImageCandidate =>
            Boolean(
              candidate.id &&
                candidate.sourceUrl &&
                isPinterestCandidateUrl(candidate.imageUrl),
            ),
        )
    : [];
  if (!candidates.length) {
    throw new SlideshowApiError("Pinterest returned no usable images.", 422);
  }
  return candidates;
}

export async function uploadSlideshowCollection(
  files: FileList | File[],
  apiBaseUrl = "/api/slideshows",
) {
  const selected = Array.from(files);
  if (!selected.length) {
    throw new SlideshowApiError("Select at least one image.", 400);
  }
  const formData = new FormData();
  selected.forEach((file) => formData.append("files", file));
  formData.set(
    "name",
    selected.length === 1 ? selected[0].name : `Uploaded set (${selected.length})`,
  );
  formData.set("autoCaption", "true");
  const response = await fetch(`${apiBaseUrl}/image-collections/upload`, {
    method: "POST",
    body: formData,
  });
  const collection = deserializeCollection(await readJsonResponse(response));
  if (!collection) {
    throw new SlideshowApiError("Upload completed without a collection.", 500);
  }
  return collection;
}
