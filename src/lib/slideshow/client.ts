import { createBlankSlideshowProject } from "@/components/slideshow/fixtures";
import { normalizeSlideshowSlides } from "@/components/slideshow/model";
import type {
  SlideshowAutomation,
  SlideshowAspectRatio,
  SlideshowProject,
  SlideshowSlide,
} from "@/components/slideshow/types";
import { isLocalSlideshowId } from "@/components/slideshow/types";
import { formatGenerationPromptForEditing } from "@/lib/ai/prompt-presentation";
import { fetchSlideshowProjectPage } from "@/lib/slideshow/list-client";
import {
  parseSlideshowProject,
  slideKindFromUnknown,
  slideshowProjectWriteBody,
} from "@/lib/slideshow/project";

type JsonRecord = Record<string, unknown>;

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


function readTextItems(content: JsonRecord) {
  const rawItems = Array.isArray(content.textItems) ? content.textItems : [];
  return rawItems.filter(isRecord);
}

export function deserializeSlideshowProject(input: unknown): SlideshowProject {
  const project = parseSlideshowProject(input);
  return {
    ...project,
    slides: normalizeSlideshowSlides(project.slides, project.includeCta),
  };
}

export function serializeSlideshowProject(project: SlideshowProject) {
  return slideshowProjectWriteBody(project);
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
    if (page.length === 0) break;
  }

  return items;
}

export async function fetchSlideshowProjects(apiBaseUrl = "/api/slideshows") {
  return (await fetchSlideshowProjectPage({ apiBaseUrl })).projects;
}

export async function fetchSlideshowProject(
  id: string,
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowProject> {
  if (isLocalSlideshowId(id)) {
    throw new SlideshowApiError(
      "Wait for the draft to finish saving before fetching it.",
      409,
    );
  }
  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  return deserializeSlideshowProject(unwrapProject(await readJsonResponse(response)));
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
    eyebrow: asString(content.eyebrow, asString(textItems[0]?.text, slide.eyebrow)),
    headline: asString(
      content.headline ?? content.heading,
      asString(textItems[1]?.text, slide.headline),
    ),
    body: asString(content.body, asString(textItems[2]?.text, slide.body)),
    prompt: formatGenerationPromptForEditing(
      asString(generated.imagePrompt, slide.prompt),
    ),
  };
}

export async function requestSlideshowStory(
  input: {
    idea: string;
    slideCount: number;
    language: string;
    includeCta: boolean;
    model?: string;
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
    const kind = slideKindFromUnknown(raw.kind ?? raw.role);
    const id = `local-slide-${localId}-${index + 1}`;
    return {
      id,
      clientId: id,
      order: index,
      kind,
      eyebrow: asString(
        content.eyebrow,
        kind === "hook" ? "START HERE" : kind === "cta" ? "NEXT STEP" : `POINT ${index}`,
      ),
      headline: asString(content.headline ?? content.heading, `Slide ${index + 1}`),
      body: asString(content.body),
      prompt: asString(raw.imagePrompt ?? content.imagePrompt),
      visualKey: visualKeys[index % visualKeys.length],
    };
  });
  const includeCta = slides.some((slide) => slide.kind === "cta");

  return {
    ...base,
    id: localId,
    clientId: localId,
    title: asString(story.title, input.idea).slice(0, 160),
    description: input.idea,
    caption: asString(story.caption) || undefined,
    generationProvider:
      responseRecord.provider === "ollama" ? "ollama" : "local-fallback",
    generationModel:
      responseRecord.model && typeof responseRecord.model === "string"
        ? responseRecord.model
        : null,
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
  model?: string,
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
        ...(model ? { model } : {}),
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

export async function requestSlideshowCreatorDerive(
  apiBaseUrl = "/api/slideshows",
  options: {
    collectionAssetIds?: string[];
    referenceImageUrls?: string[];
    idempotencyKey?: string;
  } = {},
) {
  const response = await fetch(`${apiBaseUrl}/creator/derive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collectionAssetIds: options.collectionAssetIds ?? [],
      referenceImageUrls: options.referenceImageUrls ?? [],
      idempotencyKey: options.idempotencyKey,
    }),
  });
  const data = await readJsonResponse(response);
  const record = isRecord(data) ? data : {};
  return {
    template: isRecord(record.template) ? record.template : null,
    model: asString(record.model),
    referenceCount: asNumber(record.referenceCount, 0),
    error: asString(record.error),
  };
}

export async function requestSlideshowCreatorVisuals(
  project: SlideshowProject,
  slides: Array<{
    slideId: string;
    text: string;
    scene?: { location?: string; activity?: string; subject?: string };
  }>,
  template: unknown,
  apiBaseUrl = "/api/slideshows",
  options: { model?: string; aspectRatio?: SlideshowAspectRatio } = {},
) {
  if (isLocalSlideshowId(project.id)) {
    throw new SlideshowApiError(
      "Wait for the draft to finish saving before generating visuals.",
      409,
    );
  }
  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(project.id)}/generate-visuals`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template,
        slides,
        aspectRatio: options.aspectRatio ?? project.aspectRatio ?? "9:16",
        model: options.model ?? "gpt-image-2",
      }),
    },
  );
  const data = await readJsonResponse(response);
  const record = isRecord(data) ? data : {};
  return {
    jobs: Array.isArray(record.jobs) ? record.jobs : [],
    model: asString(record.model, "gpt-image-2"),
    estimatedCost: asNumber(record.estimatedCost, 0),
    projectRevision: asNumber(record.projectRevision, project.revision ?? 0),
    error: asString(record.error),
  };
}

export type CreatorJobStatus = {
  status: "queued" | "processing" | "completed" | "failed";
  error?: string | null;
  imageUrl?: string | null;
};

/**
 * Wait until every queued creator job reaches a terminal state, returning the
 * number completed and a list of failures. Polls each job's status endpoint.
 * Never throws for provider failures; failures are surfaced to the caller so
 * the operator can retry individual slides inside the editor.
 */
export async function waitForCreatorVisuals(
  jobs: Array<{ jobId: string }>,
  onProgress?: (completed: number, total: number) => void,
): Promise<{ completed: number; failed: Array<{ jobId: string; error: string }> }> {
  const results = new Map<string, { status: string; error?: string }>();
  const deadline = Date.now() + 4 * 60 * 1000; // generous 4 min cap

  while (Date.now() < deadline) {
    const pending = jobs.filter((job) => {
      const current = results.get(job.jobId);
      return !current || (current.status !== "completed" && current.status !== "failed");
    });
    if (pending.length === 0) break;

    await Promise.all(
      pending.map(async (job) => {
        try {
          const response = await fetch(`/api/jobs/${encodeURIComponent(job.jobId)}`, {
            cache: "no-store",
          });
          const data = (await response.json()) as { status?: string; error?: string | null };
          results.set(job.jobId, {
            status: data.status ?? "processing",
            error: data.error ?? undefined,
          });
        } catch {
          // transient network error — retry on the next tick
        }
      }),
    );

    const completed = [...results.values()].filter((r) => r.status === "completed").length;
    onProgress?.(completed, jobs.length);

    const allSettled = jobs.every((job) => {
      const current = results.get(job.jobId);
      return current && (current.status === "completed" || current.status === "failed");
    });
    if (allSettled) break;
    await delay(1800);
  }

  const completed = [...results.values()].filter((r) => r.status === "completed").length;
  const failed = jobs
    .filter((job) => results.get(job.jobId)?.status === "failed")
    .map((job) => ({
      jobId: job.jobId,
      error: results.get(job.jobId)?.error ?? "Generation failed.",
    }));
  return { completed, failed };
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
