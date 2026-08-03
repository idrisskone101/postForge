import type {
  Prisma,
  SlideshowAutomationStatus,
  SlideshowProjectStatus,
  SlideshowSlideKind,
} from "@/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { getModel } from "@/lib/ai/models";
import type { SlideshowRenderProject } from "@/lib/ai/slideshow-renderer";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import {
  nextSlideshowAutomationRun,
  parseSlideshowAutomationSchedule,
} from "@/lib/slideshow/automation-schedule";
import {
  readSlideshowAutomationVisualSettings,
  SLIDESHOW_AUTOMATION_VISUAL_POLICIES,
} from "@/lib/slideshow/automation-visuals";
import {
  DEFAULT_PROJECT_LAYOUT,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SLIDE_CONTENT,
  DEFAULT_SLIDE_LAYOUT,
  DEFAULT_SLIDE_SETTINGS,
  MAX_IMAGES_PER_COLLECTION,
  MAX_SLIDES_PER_PROJECT,
  SLIDESHOW_AUTOMATION_STATUSES,
  SLIDESHOW_PROJECT_STATUSES,
  SLIDESHOW_SLIDE_KINDS,
  type SlideshowSlideKindValue,
} from "@/lib/slideshow/constants";
import {
  badRequest,
  notFound,
  revisionConflict,
} from "@/lib/slideshow/errors";
import {
  cloneJson,
  isRecord,
  optionalEnum,
  optionalId,
  optionalInteger,
  optionalJsonObject,
  optionalNullableDate,
  optionalString,
  requireRecord,
  requiredString,
  requireRevision,
  type JsonRecord,
} from "@/lib/slideshow/validation";

const projectInclude = {
  slides: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
} satisfies Prisma.SlideshowProjectInclude;

const collectionInclude = {
  images: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
} satisfies Prisma.SlideshowImageCollectionInclude;

type ProjectRecord = Prisma.SlideshowProjectGetPayload<{
  include: typeof projectInclude;
}>;
type SlideRecord = ProjectRecord["slides"][number];
type CollectionRecord = Prisma.SlideshowImageCollectionGetPayload<{
  include: typeof collectionInclude;
}>;
type ImageRecord = CollectionRecord["images"][number];
type Transaction = Prisma.TransactionClient;

function recordOrEmpty(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

const automationWeekdayNames = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

function canonicalAutomationSchedule(value: unknown): Prisma.InputJsonValue {
  try {
    const parsed = parseSlideshowAutomationSchedule(value);
    const source = recordOrEmpty(value);
    return inputJson({
      ...source,
      weekdays: parsed.weekdays.map((weekday) => automationWeekdayNames[weekday]),
      time: parsed.time,
      timezone: parsed.timezone,
    });
  } catch (error) {
    badRequest(
      error instanceof Error ? error.message : "Automation schedule is invalid",
      "invalid_schedule"
    );
  }
}

function nextAutomationRun(value: unknown, after = new Date()) {
  try {
    return nextSlideshowAutomationRun(value, after);
  } catch (error) {
    badRequest(
      error instanceof Error ? error.message : "Automation schedule is invalid",
      "invalid_schedule"
    );
  }
}

function inputJson(value: unknown): Prisma.InputJsonValue {
  return cloneJson(value) as Prisma.InputJsonValue;
}

function mergeRecord(base: unknown, patch: unknown): JsonRecord {
  const baseRecord = recordOrEmpty(base);
  const patchRecord = recordOrEmpty(patch);
  return { ...cloneJson(baseRecord), ...cloneJson(patchRecord) };
}

function jsonWithoutClientId(value: unknown): Prisma.InputJsonValue {
  const result = cloneJson(recordOrEmpty(value));
  delete result.clientId;
  delete result.successfulExportCount;
  delete result.lastExportedAt;
  delete result.lastExportFormat;
  delete result.exportHistory;
  return inputJson(result);
}

const serverProjectActivityKeys = [
  "successfulExportCount",
  "lastExportedAt",
  "lastExportFormat",
  "exportHistory",
] as const;

function projectSettingsFrom(
  body: JsonRecord,
  current: unknown = DEFAULT_PROJECT_SETTINGS
): Prisma.InputJsonValue {
  const explicit = optionalJsonObject(body, "settings");
  const result = mergeRecord(current, explicit);

  const aliases = [
    "aspectRatio",
    "phaseSettings",
    "textSettings",
    "includeCta",
    "preventRepeats",
    "language",
    "templateId",
  ] as const;
  for (const key of aliases) {
    if (body[key] !== undefined) result[key] = cloneJson(body[key]);
  }

  // Export activity is server-owned. A normal editor save may omit these keys,
  // but it must never erase or forge them.
  const currentRecord = recordOrEmpty(current);
  for (const key of serverProjectActivityKeys) {
    if (Object.prototype.hasOwnProperty.call(currentRecord, key)) {
      result[key] = cloneJson(currentRecord[key]);
    } else {
      delete result[key];
    }
  }

  return inputJson(result);
}

function projectLayoutFrom(
  body: JsonRecord,
  current: unknown = DEFAULT_PROJECT_LAYOUT
): Prisma.InputJsonValue {
  const explicit = optionalJsonObject(body, "layout");
  return inputJson(mergeRecord(current, explicit));
}

function slideKindFrom(body: JsonRecord, fallback: SlideshowSlideKindValue) {
  const direct = optionalEnum(body, "kind", SLIDESHOW_SLIDE_KINDS);
  if (direct) return direct;

  const role = body.role;
  if (role === undefined) return fallback;
  if (role === "body") return "content";
  if (role === "hook" || role === "cta") return role;
  badRequest("role must be one of: hook, body, cta");
}

function slideContentFrom(
  body: JsonRecord,
  current: unknown = DEFAULT_SLIDE_CONTENT
): Prisma.InputJsonValue {
  const explicit = optionalJsonObject(body, "content");
  const result = mergeRecord(current, explicit);
  for (const key of ["eyebrow", "headline", "body"] as const) {
    if (body[key] !== undefined) {
      const value = optionalString(body, key, { max: key === "body" ? 1_000 : 300 });
      result[key] = value;
    }
  }
  return inputJson(result);
}

function slideSettingsFrom(
  body: JsonRecord,
  current: unknown = DEFAULT_SLIDE_SETTINGS
): Prisma.InputJsonValue {
  const explicit = optionalJsonObject(body, "settings");
  const result = mergeRecord(current, explicit);
  if (body.visualKey !== undefined) {
    result.visualKey = optionalString(body, "visualKey", { max: 200 });
  }
  return inputJson(result);
}

function slideLayoutFrom(
  body: JsonRecord,
  current: unknown = DEFAULT_SLIDE_LAYOUT
): Prisma.InputJsonValue {
  const explicit = optionalJsonObject(body, "layout");
  return inputJson(mergeRecord(current, explicit));
}

function nullableStringAlias(
  body: JsonRecord,
  canonicalKey: string,
  aliasKey?: string,
  max = 2_000
) {
  if (body[canonicalKey] !== undefined) {
    return optionalString(body, canonicalKey, { max, nullable: true });
  }
  if (aliasKey && body[aliasKey] !== undefined) {
    return optionalString(body, aliasKey, { max, nullable: true });
  }
  return undefined;
}

function optionalDescription(body: JsonRecord) {
  if (body.description === undefined) return undefined;
  if (body.description === null) return null;
  if (typeof body.description === "string" && !body.description.trim()) return null;
  return optionalString(body, "description", { max: 2_000, nullable: true });
}

interface ParsedSlide {
  id?: string;
  kind: SlideshowSlideKindValue;
  imageUrl: string | null;
  imagePrompt: string | null;
  generationJobId: string | null;
  generatedFileId: string | null;
  sourceImageId: string | null;
  content: Prisma.InputJsonValue;
  settings: Prisma.InputJsonValue;
  layout: Prisma.InputJsonValue;
}

function parseFullSlide(value: unknown, current?: SlideRecord): ParsedSlide {
  const body = requireRecord(value, "slide");
  const id = optionalId(body, "id");
  return {
    ...(id ? { id } : {}),
    kind: slideKindFrom(
      body,
      (current?.kind as SlideshowSlideKindValue | undefined) ?? "content"
    ),
    imageUrl:
      body.imageUrl !== undefined
        ? (nullableStringAlias(body, "imageUrl", undefined, 4_000) ?? null)
        : (current?.imageUrl ?? null),
    imagePrompt:
      body.imagePrompt !== undefined || body.prompt !== undefined
        ? (nullableStringAlias(body, "imagePrompt", "prompt", 2_000) ?? null)
        : (current?.imagePrompt ?? null),
    generationJobId:
      body.generationJobId !== undefined
        ? (optionalId(body, "generationJobId", true) ?? null)
        : (current?.generationJobId ?? null),
    generatedFileId:
      body.generatedFileId !== undefined
        ? (optionalId(body, "generatedFileId", true) ?? null)
        : (current?.generatedFileId ?? null),
    sourceImageId:
      body.sourceImageId !== undefined
        ? (optionalId(body, "sourceImageId", true) ?? null)
        : (current?.sourceImageId ?? null),
    content: slideContentFrom(body, current?.content),
    settings: slideSettingsFrom(body, current?.settings),
    layout: slideLayoutFrom(body, current?.layout),
  };
}

function serializeSlide(slide: SlideRecord) {
  const content = recordOrEmpty(slide.content);
  const settings = recordOrEmpty(slide.settings);
  const textItems = Array.isArray(content.textItems) ? content.textItems : [];
  const firstTextItem = textItems.find(isRecord);
  const fallbackHeadline = readString(firstTextItem?.text);
  const role = slide.kind === "content" ? "body" : slide.kind;
  const imageUrls = Array.isArray(content.imageUrls)
    ? content.imageUrls.filter((value): value is string => typeof value === "string")
    : [];
  const visualKeys = Array.isArray(content.visualKeys)
    ? content.visualKeys.filter((value): value is string => typeof value === "string")
    : [];

  return {
    id: slide.id,
    projectId: slide.projectId,
    position: slide.position,
    order: slide.position,
    kind: slide.kind,
    role,
    eyebrow: readString(content.eyebrow),
    headline: readString(content.headline, fallbackHeadline),
    body: readString(content.body),
    imageUrl: slide.imageUrl,
    imageUrls,
    imagePrompt: slide.imagePrompt,
    prompt: slide.imagePrompt ?? "",
    visualKey: readString(
      content.visualKey,
      readString(settings.visualKey, `slide-${(slide.position % 8) + 1}`)
    ),
    visualKeys,
    generationJobId: slide.generationJobId,
    generatedFileId: slide.generatedFileId,
    sourceImageId: slide.sourceImageId,
    content: slide.content,
    settings: slide.settings,
    layout: slide.layout,
    createdAt: slide.createdAt.toISOString(),
    updatedAt: slide.updatedAt.toISOString(),
  };
}

export function serializeSlideshowProject(project: ProjectRecord) {
  const settings = recordOrEmpty(project.settings);
  const defaults = DEFAULT_PROJECT_SETTINGS;
  const exportHistory = Array.isArray(settings.exportHistory)
    ? settings.exportHistory.filter(
        (value): value is string =>
          typeof value === "string" && Number.isFinite(Date.parse(value)),
      )
    : [];
  return {
    id: project.id,
    title: project.title,
    caption: readString(recordOrEmpty(project.settings).caption),
    description: project.description ?? undefined,
    status: project.status,
    revision: project.revision,
    aspectRatio: readString(settings.aspectRatio, defaults.aspectRatio),
    phaseSettings: settings.phaseSettings ?? defaults.phaseSettings,
    textSettings: settings.textSettings ?? defaults.textSettings,
    includeCta:
      typeof settings.includeCta === "boolean"
        ? settings.includeCta
        : defaults.includeCta,
    preventRepeats:
      typeof settings.preventRepeats === "boolean"
        ? settings.preventRepeats
        : defaults.preventRepeats,
    language: readString(settings.language, defaults.language),
    templateId:
      typeof settings.templateId === "string" ? settings.templateId : null,
    successfulExportCount:
      typeof settings.successfulExportCount === "number" &&
      Number.isSafeInteger(settings.successfulExportCount) &&
      settings.successfulExportCount >= 0
        ? settings.successfulExportCount
        : exportHistory.length,
    lastExportedAt:
      typeof settings.lastExportedAt === "string" &&
      Number.isFinite(Date.parse(settings.lastExportedAt))
        ? settings.lastExportedAt
        : exportHistory.at(-1) ?? null,
    exportHistory,
    settings: project.settings,
    layout: project.layout,
    slideCount: project.slides.length,
    slides: project.slides.map(serializeSlide),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function recordSlideshowExport(
  id: string,
  format: "photo-carousel" | "mp4",
  exportedAt = new Date(),
) {
  return prisma.$transaction(async (tx) => {
    // Updating the row first is an explicit lock shared with editor saves. We
    // intentionally do not increment the editor revision for analytics-only
    // metadata, so a completed download cannot make the open editor stale.
    const locked = await tx.slideshowProject.updateMany({
      where: { id },
      data: { updatedAt: exportedAt },
    });
    if (locked.count !== 1) notFound("Slideshow");

    const current = await tx.slideshowProject.findUnique({
      where: { id },
      select: { settings: true },
    });
    if (!current) notFound("Slideshow");
    const settings = cloneJson(recordOrEmpty(current.settings));
    const previousHistory = Array.isArray(settings.exportHistory)
      ? settings.exportHistory.filter(
          (value): value is string =>
            typeof value === "string" && Number.isFinite(Date.parse(value)),
        )
      : [];
    const history = [...previousHistory, exportedAt.toISOString()].slice(-500);
    const previousCount =
      typeof settings.successfulExportCount === "number" &&
      Number.isSafeInteger(settings.successfulExportCount) &&
      settings.successfulExportCount >= 0
        ? settings.successfulExportCount
        : previousHistory.length;
    const successfulExportCount = previousCount + 1;
    settings.successfulExportCount = successfulExportCount;
    settings.lastExportedAt = exportedAt.toISOString();
    settings.lastExportFormat = format;
    settings.exportHistory = history;

    await tx.slideshowProject.update({
      where: { id },
      data: { settings: inputJson(settings) },
    });
    return {
      successfulExportCount,
      exportedAt: exportedAt.toISOString(),
      format,
      history,
    };
  });
}

async function getProjectRecord(id: string, tx: Transaction | typeof prisma = prisma) {
  const project = await tx.slideshowProject.findUnique({
    where: { id },
    include: projectInclude,
  });
  if (!project) notFound("Slideshow");
  return project;
}

async function claimProject(
  tx: Transaction,
  id: string,
  expectedRevision: number
) {
  const claimed = await tx.slideshowProject.updateMany({
    where: { id, revision: expectedRevision },
    data: { revision: { increment: 1 } },
  });
  if (claimed.count === 1) return;

  const current = await tx.slideshowProject.findUnique({
    where: { id },
    select: { revision: true },
  });
  if (!current) notFound("Slideshow");
  revisionConflict(current.revision);
}

async function setSlidePositions(
  tx: Transaction,
  projectId: string,
  orderedIds: string[]
) {
  if (!orderedIds.length) return;
  const offset = orderedIds.length + MAX_SLIDES_PER_PROJECT + 1;
  await tx.slideshowSlide.updateMany({
    where: { projectId, id: { in: orderedIds } },
    data: { position: { increment: offset } },
  });
  for (let position = 0; position < orderedIds.length; position += 1) {
    await tx.slideshowSlide.update({
      where: { id: orderedIds[position] },
      data: { position },
    });
  }
}

async function replaceProjectSlides(
  tx: Transaction,
  projectId: string,
  values: unknown[]
) {
  if (values.length > MAX_SLIDES_PER_PROJECT) {
    badRequest(`A slideshow can contain at most ${MAX_SLIDES_PER_PROJECT} slides`);
  }

  const existing = await tx.slideshowSlide.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });
  const existingById = new Map(existing.map((slide) => [slide.id, slide]));
  const requestedIds = values
    .map((value) => (isRecord(value) ? optionalId(value, "id") : undefined))
    .filter((value): value is string => !!value);
  if (new Set(requestedIds).size !== requestedIds.length) {
    badRequest("slides must not contain duplicate ids");
  }
  for (const id of requestedIds) {
    if (!existingById.has(id)) {
      badRequest(`Slide ${id} does not belong to this slideshow`);
    }
  }

  const offset = existing.length + values.length + MAX_SLIDES_PER_PROJECT + 1;
  if (existing.length) {
    await tx.slideshowSlide.updateMany({
      where: { projectId },
      data: { position: { increment: offset } },
    });
  }
  await tx.slideshowSlide.deleteMany({
    where: {
      projectId,
      ...(requestedIds.length ? { id: { notIn: requestedIds } } : {}),
    },
  });

  for (let position = 0; position < values.length; position += 1) {
    const raw = requireRecord(values[position], `slides[${position}]`);
    const id = optionalId(raw, "id");
    const parsed = parseFullSlide(raw, id ? existingById.get(id) : undefined);
    const data = {
      position,
      kind: parsed.kind as SlideshowSlideKind,
      imageUrl: parsed.imageUrl,
      imagePrompt: parsed.imagePrompt,
      generationJobId: parsed.generationJobId,
      generatedFileId: parsed.generatedFileId,
      sourceImageId: parsed.sourceImageId,
      content: parsed.content,
      settings: parsed.settings,
      layout: parsed.layout,
    };
    if (id) {
      await tx.slideshowSlide.update({ where: { id }, data });
    } else {
      await tx.slideshowSlide.create({ data: { projectId, ...data } });
    }
  }
}

export async function listSlideshowProjects(options: {
  status?: string | null;
  limit: number;
  offset: number;
}) {
  const status = options.status
    ? optionalEnum({ status: options.status }, "status", SLIDESHOW_PROJECT_STATUSES)
    : undefined;
  const where = status
    ? { status: status as SlideshowProjectStatus }
    : undefined;
  const [projects, total] = await Promise.all([
    prisma.slideshowProject.findMany({
      where,
      include: projectInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: options.limit,
      skip: options.offset,
    }),
    prisma.slideshowProject.count({ where }),
  ]);

  return {
    projects: projects.map(serializeSlideshowProject),
    total,
    limit: options.limit,
    offset: options.offset,
  };
}

export async function getSlideshowProject(id: string) {
  return serializeSlideshowProject(await getProjectRecord(id));
}

export async function listSlideshowSlides(projectId: string) {
  const project = await getProjectRecord(projectId);
  return {
    projectId,
    revision: project.revision,
    slides: project.slides.map(serializeSlide),
  };
}

export async function getSlideshowSlide(projectId: string, slideId: string) {
  const project = await getProjectRecord(projectId);
  const slide = project.slides.find((candidate) => candidate.id === slideId);
  if (!slide) notFound("Slide");
  return {
    projectId,
    revision: project.revision,
    slide: serializeSlide(slide),
  };
}

export async function createSlideshowProject(input: unknown) {
  const body = requireRecord(input);
  const title = optionalString(body, "title", { max: 160 }) ?? "Untitled slideshow";
  const description = optionalDescription(body);
  const status = optionalEnum(body, "status", SLIDESHOW_PROJECT_STATUSES) ?? "draft";
  const slides = body.slides;
  if (slides !== undefined && !Array.isArray(slides)) {
    badRequest("slides must be an array");
  }
  if (Array.isArray(slides) && slides.length > MAX_SLIDES_PER_PROJECT) {
    badRequest(`A slideshow can contain at most ${MAX_SLIDES_PER_PROJECT} slides`);
  }

  const parsedSlides = (slides ?? []).map((value, position) => {
    const parsed = parseFullSlide(value);
    return {
      position,
      kind: parsed.kind as SlideshowSlideKind,
      imageUrl: parsed.imageUrl,
      imagePrompt: parsed.imagePrompt,
      generationJobId: parsed.generationJobId,
      generatedFileId: parsed.generatedFileId,
      sourceImageId: parsed.sourceImageId,
      content: parsed.content,
      settings: parsed.settings,
      layout: parsed.layout,
    };
  });

  const project = await prisma.slideshowProject.create({
    data: {
      title,
      ...(description !== undefined ? { description } : {}),
      status: status as SlideshowProjectStatus,
      settings: projectSettingsFrom(body),
      layout: projectLayoutFrom(body),
      slides: parsedSlides.length ? { create: parsedSlides } : undefined,
    },
    include: projectInclude,
  });
  return serializeSlideshowProject(project);
}

export async function updateSlideshowProject(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, id, revision);
    const current = await getProjectRecord(id, tx);
    const title = optionalString(body, "title", { max: 160 });
    const description = optionalDescription(body);
    const status = optionalEnum(body, "status", SLIDESHOW_PROJECT_STATUSES);
    const hasSettingsAliases = [
      "settings",
      "aspectRatio",
      "phaseSettings",
      "textSettings",
      "includeCta",
      "preventRepeats",
      "language",
      "templateId",
    ].some((key) => body[key] !== undefined);

    if (body.slides !== undefined) {
      if (!Array.isArray(body.slides)) badRequest("slides must be an array");
      await replaceProjectSlides(tx, id, body.slides);
    }

    await tx.slideshowProject.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined
          ? { status: status as SlideshowProjectStatus }
          : {}),
        ...(hasSettingsAliases
          ? { settings: projectSettingsFrom(body, current.settings) }
          : {}),
        ...(body.layout !== undefined
          ? { layout: projectLayoutFrom(body, current.layout) }
          : {}),
      },
    });
    return serializeSlideshowProject(await getProjectRecord(id, tx));
  });
}

export async function deleteSlideshowProject(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  await prisma.$transaction(async (tx) => {
    await claimProject(tx, id, revision);
    await tx.slideshowProject.delete({ where: { id } });
  });
}

export async function duplicateSlideshowProject(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  const source = await getProjectRecord(id);
  if (source.revision !== revision) revisionConflict(source.revision);
  const requestedTitle = optionalString(body, "title", { max: 160 });

  const duplicate = await prisma.slideshowProject.create({
    data: {
      title: requestedTitle ?? `Copy of ${source.title}`.slice(0, 160),
      description: source.description,
      status: "draft",
      settings: jsonWithoutClientId(source.settings),
      layout: inputJson(source.layout),
      slides: source.slides.length
        ? {
            create: source.slides.map((slide) => ({
              position: slide.position,
              kind: slide.kind,
              imageUrl: slide.imageUrl,
              imagePrompt: slide.imagePrompt,
              generationJobId: slide.generationJobId,
              generatedFileId: slide.generatedFileId,
              sourceImageId: slide.sourceImageId,
              content: jsonWithoutClientId(slide.content),
              settings: inputJson(slide.settings),
              layout: inputJson(slide.layout),
            })),
          }
        : undefined,
    },
    include: projectInclude,
  });
  return serializeSlideshowProject(duplicate);
}

export async function addSlideshowSlide(projectId: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, revision);
    const existing = await tx.slideshowSlide.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
    });
    if (existing.length >= MAX_SLIDES_PER_PROJECT) {
      badRequest(`A slideshow can contain at most ${MAX_SLIDES_PER_PROJECT} slides`);
    }
    const requestedPosition = optionalInteger(body, "position", {
      min: 0,
      max: existing.length,
    });
    const position = requestedPosition ?? existing.length;
    const parsed = parseFullSlide(body);
    const created = await tx.slideshowSlide.create({
      data: {
        projectId,
        position: existing.length,
        kind: parsed.kind as SlideshowSlideKind,
        imageUrl: parsed.imageUrl,
        imagePrompt: parsed.imagePrompt,
        generationJobId: parsed.generationJobId,
        generatedFileId: parsed.generatedFileId,
        sourceImageId: parsed.sourceImageId,
        content: parsed.content,
        settings: parsed.settings,
        layout: parsed.layout,
      },
    });
    const ids = existing.map((slide) => slide.id);
    ids.splice(position, 0, created.id);
    await setSlidePositions(tx, projectId, ids);
    return serializeSlideshowProject(await getProjectRecord(projectId, tx));
  });
}

export async function updateSlideshowSlide(
  projectId: string,
  slideId: string,
  input: unknown
) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, revision);
    const current = await tx.slideshowSlide.findFirst({
      where: { id: slideId, projectId },
    });
    if (!current) notFound("Slide");
    const parsed = parseFullSlide(body, current);
    await tx.slideshowSlide.update({
      where: { id: slideId },
      data: {
        kind: parsed.kind as SlideshowSlideKind,
        imageUrl: parsed.imageUrl,
        imagePrompt: parsed.imagePrompt,
        generationJobId: parsed.generationJobId,
        generatedFileId: parsed.generatedFileId,
        sourceImageId: parsed.sourceImageId,
        content: parsed.content,
        settings: parsed.settings,
        layout: parsed.layout,
      },
    });
    return serializeSlideshowProject(await getProjectRecord(projectId, tx));
  });
}

export async function deleteSlideshowSlide(
  projectId: string,
  slideId: string,
  input: unknown
) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, revision);
    const slide = await tx.slideshowSlide.findFirst({
      where: { id: slideId, projectId },
      select: { id: true },
    });
    if (!slide) notFound("Slide");
    await tx.slideshowSlide.delete({ where: { id: slideId } });
    const remaining = await tx.slideshowSlide.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await setSlidePositions(
      tx,
      projectId,
      remaining.map((item) => item.id)
    );
    return serializeSlideshowProject(await getProjectRecord(projectId, tx));
  });
}

export async function reorderSlideshowSlides(projectId: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  if (!Array.isArray(body.slideIds) || !body.slideIds.every((id) => typeof id === "string")) {
    badRequest("slideIds must be an array of slide ids");
  }
  const slideIds = body.slideIds as string[];
  if (new Set(slideIds).size !== slideIds.length) {
    badRequest("slideIds must not contain duplicates");
  }

  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, revision);
    const current = await tx.slideshowSlide.findMany({
      where: { projectId },
      select: { id: true },
    });
    const currentIds = new Set(current.map((slide) => slide.id));
    if (
      currentIds.size !== slideIds.length ||
      slideIds.some((id) => !currentIds.has(id))
    ) {
      badRequest("slideIds must contain every slide exactly once");
    }
    await setSlidePositions(tx, projectId, slideIds);
    return serializeSlideshowProject(await getProjectRecord(projectId, tx));
  });
}

export async function prepareSlideImageGeneration(
  projectId: string,
  slideId: string,
  input: unknown
) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  const requestedPrompt = optionalString(body, "prompt", { max: 2_000 });
  const project = await getProjectRecord(projectId);
  if (project.revision !== revision) revisionConflict(project.revision);
  const slide = project.slides.find((candidate) => candidate.id === slideId);
  if (!slide) notFound("Slide");
  const prompt = requestedPrompt ?? slide.imagePrompt;
  if (!prompt) badRequest("The slide needs an image prompt before generation");
  const settings = recordOrEmpty(project.settings);
  return {
    prompt,
    aspectRatio: readString(settings.aspectRatio, "9:16"),
    expectedRevision: revision,
  };
}

export type SlideshowGenerationJobReservation = {
  model: string;
  prompt: string;
  input: JsonRecord;
  estimatedCost: number;
  tags: string[];
};

export async function reserveSlideGenerationJob(
  projectId: string,
  slideId: string,
  expectedRevision: number,
  reservation: SlideshowGenerationJobReservation
) {
  return prisma.$transaction(async (tx) => {
    await claimProject(tx, projectId, expectedRevision);
    const slide = await tx.slideshowSlide.findFirst({
      where: { id: slideId, projectId },
      select: { id: true },
    });
    if (!slide) notFound("Slide");
    const job = await tx.generationJob.create({
      data: {
        type: "image",
        model: reservation.model,
        prompt: reservation.prompt,
        input: inputJson(reservation.input),
        estimatedCost: reservation.estimatedCost,
        status: "queued",
        tags: reservation.tags,
      },
    });
    await tx.slideshowSlide.update({
      where: { id: slideId },
      data: {
        generationJobId: job.id,
        generatedFileId: null,
        imageUrl: null,
      },
    });
    return { jobId: job.id, projectRevision: expectedRevision + 1 };
  });
}

export async function attachSlideshowGeneratedFile(
  generationJobId: string,
  generatedFileId: string
) {
  return prisma.$transaction(async (tx) => {
    const fileUrl = `/api/files/${generatedFileId}`;
    const initialLinks = await tx.slideshowSlide.findMany({
      where: { generationJobId },
      select: { projectId: true },
    });
    const projectIds = Array.from(
      new Set(initialLinks.map((slide) => slide.projectId))
    );
    if (!projectIds.length) return;

    // Lock the owning projects before reconciling their slide rows. Completion
    // is a distinct server mutation, so changed projects receive a new revision;
    // stale autosaves then fail instead of erasing the generated image.
    await tx.slideshowProject.updateMany({
      where: { id: { in: projectIds } },
      data: { updatedAt: new Date() },
    });
    const linkedSlides = await tx.slideshowSlide.findMany({
      where: { generationJobId },
      select: {
        id: true,
        projectId: true,
        generatedFileId: true,
        imageUrl: true,
      },
    });
    const changedSlides = linkedSlides.filter(
      (slide) =>
        slide.generatedFileId !== generatedFileId || slide.imageUrl !== fileUrl
    );
    if (!changedSlides.length) return;

    await tx.slideshowSlide.updateMany({
      where: { id: { in: changedSlides.map((slide) => slide.id) } },
      data: { generatedFileId, imageUrl: fileUrl },
    });
    const changedProjectIds = Array.from(
      new Set(changedSlides.map((slide) => slide.projectId))
    );
    await tx.slideshowProject.updateMany({
      where: { id: { in: changedProjectIds } },
      data: { revision: { increment: 1 } },
    });
  });
}

function serializeAutomation(
  automation: Prisma.SlideshowAutomationGetPayload<Record<string, never>>
) {
  const schedule = recordOrEmpty(automation.schedule);
  return {
    id: automation.id,
    projectId: automation.projectId,
    name: automation.name,
    status: automation.status,
    cadence: readString(schedule.cadence, "Custom schedule"),
    schedule: automation.schedule,
    contentSettings: automation.contentSettings,
    publishSettings: automation.publishSettings,
    revision: automation.revision,
    lastRunAt: automation.lastRunAt?.toISOString() ?? null,
    nextRunAt: automation.nextRunAt?.toISOString() ?? null,
    createdAt: automation.createdAt.toISOString(),
    updatedAt: automation.updatedAt.toISOString(),
  };
}

async function claimAutomation(
  tx: Transaction,
  id: string,
  expectedRevision: number
) {
  const claimed = await tx.slideshowAutomation.updateMany({
    where: { id, revision: expectedRevision },
    data: { revision: { increment: 1 } },
  });
  if (claimed.count === 1) return;
  const current = await tx.slideshowAutomation.findUnique({
    where: { id },
    select: { revision: true },
  });
  if (!current) notFound("Slideshow automation");
  revisionConflict(current.revision);
}

async function assertProjectExists(projectId: string | null | undefined) {
  if (!projectId) return;
  const project = await prisma.slideshowProject.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) badRequest("projectId does not reference an existing slideshow");
}

async function normalizeAutomationContentSettings(
  value: unknown,
): Promise<Prisma.InputJsonValue> {
  const content = cloneJson(recordOrEmpty(value));
  delete content.successfulRunCount;
  delete content.runHistory;
  const rawPolicy = content.visualPolicy;
  if (
    rawPolicy !== undefined &&
    (typeof rawPolicy !== "string" ||
      !SLIDESHOW_AUTOMATION_VISUAL_POLICIES.includes(
        rawPolicy as (typeof SLIDESHOW_AUTOMATION_VISUAL_POLICIES)[number],
      ))
  ) {
    badRequest("visualPolicy must be one of: reuse, fresh-ai");
  }

  const visualSettings = readSlideshowAutomationVisualSettings(content);
  content.visualPolicy = visualSettings.policy;
  content.imageModel = visualSettings.imageModel;

  const model = getModel(visualSettings.imageModel);
  if (!model || model.type !== "image") {
    badRequest(`Unknown slideshow image model: ${visualSettings.imageModel}`);
  }

  if (visualSettings.policy === "fresh-ai") {
    // A saved collection is a reuse source and must never be mixed into a run
    // that explicitly requests fresh paid generations.
    delete content.imageCollectionId;
  } else if (visualSettings.imageCollectionId) {
    if (visualSettings.imageCollectionId.length > 100) {
      badRequest("imageCollectionId must be at most 100 characters");
    }
    const collection = await prisma.slideshowImageCollection.findUnique({
      where: { id: visualSettings.imageCollectionId },
      select: { id: true },
    });
    if (!collection) {
      badRequest(
        "imageCollectionId does not reference an existing slideshow image collection",
      );
    }
    content.imageCollectionId = visualSettings.imageCollectionId;
  } else {
    delete content.imageCollectionId;
  }

  return inputJson(content);
}

function preserveAutomationActivity(
  requested: unknown,
  current: unknown,
): Prisma.InputJsonValue {
  const result = cloneJson(recordOrEmpty(requested));
  const currentRecord = recordOrEmpty(current);
  for (const key of ["successfulRunCount", "runHistory"] as const) {
    if (Object.prototype.hasOwnProperty.call(currentRecord, key)) {
      result[key] = cloneJson(currentRecord[key]);
    } else {
      delete result[key];
    }
  }
  return inputJson(result);
}

export async function listSlideshowAutomations(options: {
  status?: string | null;
  projectId?: string | null;
  limit: number;
  offset: number;
}) {
  const status = options.status
    ? optionalEnum(
        { status: options.status },
        "status",
        SLIDESHOW_AUTOMATION_STATUSES
      )
    : undefined;
  const where = {
    ...(status ? { status: status as SlideshowAutomationStatus } : {}),
    ...(options.projectId ? { projectId: options.projectId } : {}),
  };
  const [automations, total] = await Promise.all([
    prisma.slideshowAutomation.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: options.limit,
      skip: options.offset,
    }),
    prisma.slideshowAutomation.count({ where }),
  ]);
  return {
    automations: automations.map(serializeAutomation),
    total,
    limit: options.limit,
    offset: options.offset,
  };
}

export async function getSlideshowAutomation(id: string) {
  const automation = await prisma.slideshowAutomation.findUnique({ where: { id } });
  if (!automation) notFound("Slideshow automation");
  return serializeAutomation(automation);
}

export async function createSlideshowAutomation(input: unknown) {
  const body = requireRecord(input);
  const name = requiredString(body, "name", { max: 160 });
  const projectId = optionalId(body, "projectId", true) ?? null;
  await assertProjectExists(projectId);
  const status =
    optionalEnum(body, "status", SLIDESHOW_AUTOMATION_STATUSES) ?? "paused";
  const schedule = canonicalAutomationSchedule(
    optionalJsonObject(body, "schedule") ?? {
      weekdays: ["Mon"],
      time: "09:00",
      timezone: "UTC",
    }
  );
  const contentSettings = await normalizeAutomationContentSettings(
    optionalJsonObject(body, "contentSettings") ?? inputJson({}),
  );
  const publishSettings =
    optionalJsonObject(body, "publishSettings") ?? inputJson({ mode: "draft" });
  // Active schedules always derive their first run from the chosen wall time.
  // Never trust a client-side placeholder such as "now + 24 hours".
  const nextRunAt =
    status === "active" ? nextAutomationRun(schedule) : null;

  const automation = await prisma.slideshowAutomation.create({
    data: {
      name,
      projectId,
      status: status as SlideshowAutomationStatus,
      schedule,
      contentSettings,
      publishSettings,
      nextRunAt,
    },
  });
  return serializeAutomation(automation);
}

export async function updateSlideshowAutomation(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  const name = optionalString(body, "name", { max: 160 });
  const projectId = optionalId(body, "projectId", true);
  await assertProjectExists(projectId);
  const status = optionalEnum(body, "status", SLIDESHOW_AUTOMATION_STATUSES);
  const rawSchedule = optionalJsonObject(body, "schedule");
  const schedule =
    rawSchedule !== undefined
      ? canonicalAutomationSchedule(rawSchedule)
      : undefined;
  const requestedContentSettings = optionalJsonObject(body, "contentSettings");
  const normalizedContentSettings =
    requestedContentSettings === undefined
      ? undefined
      : await normalizeAutomationContentSettings(requestedContentSettings);
  const publishSettings = optionalJsonObject(body, "publishSettings");
  const requestedNextRunAt = optionalNullableDate(body, "nextRunAt");

  return prisma.$transaction(async (tx) => {
    await claimAutomation(tx, id, revision);
    const current = await tx.slideshowAutomation.findUnique({ where: { id } });
    if (!current) notFound("Slideshow automation");
    const contentSettings =
      normalizedContentSettings === undefined
        ? undefined
        : preserveAutomationActivity(
            normalizedContentSettings,
            current.contentSettings,
          );
    const effectiveStatus = status ?? current.status;
    const effectiveSchedule = schedule ?? current.schedule;
    const shouldRecomputeRun =
      effectiveStatus === "active" &&
      (status === "active" || schedule !== undefined || !current.nextRunAt);
    const nextRunAt =
      effectiveStatus !== "active"
        ? null
        : shouldRecomputeRun
          ? nextAutomationRun(effectiveSchedule)
          : requestedNextRunAt !== undefined
            ? requestedNextRunAt
            : undefined;
    const data: Prisma.SlideshowAutomationUncheckedUpdateInput = {
      ...(name !== undefined ? { name } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
      ...(status !== undefined
        ? { status: status as SlideshowAutomationStatus }
        : {}),
      ...(schedule !== undefined ? { schedule } : {}),
      ...(contentSettings !== undefined ? { contentSettings } : {}),
      ...(publishSettings !== undefined ? { publishSettings } : {}),
      ...(nextRunAt !== undefined ? { nextRunAt } : {}),
    };
    const automation = await tx.slideshowAutomation.update({
      where: { id },
      data,
    });
    return serializeAutomation(automation);
  });
}

export async function deleteSlideshowAutomation(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  await prisma.$transaction(async (tx) => {
    await claimAutomation(tx, id, revision);
    await tx.slideshowAutomation.delete({ where: { id } });
  });
}

function serializeImage(image: ImageRecord) {
  const metadata = recordOrEmpty(image.metadata);
  return {
    id: image.id,
    collectionId: image.collectionId,
    position: image.position,
    url: image.url,
    mimeType: image.mimeType,
    fileSizeBytes: image.fileSizeBytes,
    width: image.width,
    height: image.height,
    thumbnailUrl: image.thumbnailUrl,
    altText: image.altText,
    visualKey: readString(metadata.visualKey, `image-${(image.position % 8) + 1}`),
    metadata: image.metadata,
    createdAt: image.createdAt.toISOString(),
    updatedAt: image.updatedAt.toISOString(),
  };
}

function serializeCollection(collection: CollectionRecord) {
  return {
    id: collection.id,
    title: collection.title,
    name: collection.title,
    source: collection.source,
    settings: collection.settings,
    revision: collection.revision,
    imageCount: collection.images.length,
    visualKeys: collection.images.slice(0, 4).map((image) =>
      readString(
        recordOrEmpty(image.metadata).visualKey,
        `image-${(image.position % 8) + 1}`
      )
    ),
    images: collection.images.map(serializeImage),
    createdAt: collection.createdAt.toISOString(),
    updatedAt: collection.updatedAt.toISOString(),
  };
}

function parseImage(value: unknown, current?: ImageRecord) {
  const body = requireRecord(value, "image");
  const url =
    optionalString(body, "url", { max: 4_000 }) ?? current?.url;
  if (!url) badRequest("image.url is required");
  return {
    url,
    thumbnailUrl:
      body.thumbnailUrl !== undefined
        ? (optionalString(body, "thumbnailUrl", {
            max: 4_000,
            nullable: true,
          }) ?? null)
        : (current?.thumbnailUrl ?? null),
    altText:
      body.altText !== undefined
        ? (optionalString(body, "altText", { max: 500, nullable: true }) ?? null)
        : (current?.altText ?? null),
    metadata:
      optionalJsonObject(body, "metadata") ??
      inputJson(current?.metadata ?? {}),
  };
}

async function getCollectionRecord(
  id: string,
  tx: Transaction | typeof prisma = prisma
) {
  const collection = await tx.slideshowImageCollection.findUnique({
    where: { id },
    include: collectionInclude,
  });
  if (!collection) notFound("Image collection");
  return collection;
}

async function claimCollection(
  tx: Transaction,
  id: string,
  expectedRevision: number
) {
  const claimed = await tx.slideshowImageCollection.updateMany({
    where: { id, revision: expectedRevision },
    data: { revision: { increment: 1 } },
  });
  if (claimed.count === 1) return;
  const current = await tx.slideshowImageCollection.findUnique({
    where: { id },
    select: { revision: true },
  });
  if (!current) notFound("Image collection");
  revisionConflict(current.revision);
}

async function setImagePositions(
  tx: Transaction,
  collectionId: string,
  orderedIds: string[]
) {
  if (!orderedIds.length) return;
  const offset = orderedIds.length + MAX_IMAGES_PER_COLLECTION + 1;
  await tx.slideshowImage.updateMany({
    where: { collectionId, id: { in: orderedIds } },
    data: { position: { increment: offset } },
  });
  for (let position = 0; position < orderedIds.length; position += 1) {
    await tx.slideshowImage.update({
      where: { id: orderedIds[position] },
      data: { position },
    });
  }
}

export async function listSlideshowImageCollections(options: {
  limit: number;
  offset: number;
}) {
  const [collections, total] = await Promise.all([
    prisma.slideshowImageCollection.findMany({
      include: collectionInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: options.limit,
      skip: options.offset,
    }),
    prisma.slideshowImageCollection.count(),
  ]);
  return {
    collections: collections.map(serializeCollection),
    total,
    limit: options.limit,
    offset: options.offset,
  };
}

export async function getSlideshowImageCollection(id: string) {
  return serializeCollection(await getCollectionRecord(id));
}

export async function getSlideshowImage(collectionId: string, imageId: string) {
  const collection = await getCollectionRecord(collectionId);
  const image = collection.images.find((candidate) => candidate.id === imageId);
  if (!image) notFound("Image");
  return {
    collectionId,
    revision: collection.revision,
    image: serializeImage(image),
  };
}

export async function createSlideshowImageCollection(input: unknown) {
  const body = requireRecord(input);
  const title =
    optionalString(body, "title", { max: 160 }) ??
    optionalString(body, "name", { max: 160 });
  if (!title) badRequest("title is required");
  const source = optionalString(body, "source", { max: 80 }) ?? "upload";
  const settings = optionalJsonObject(body, "settings") ?? inputJson({});
  if (body.images !== undefined && !Array.isArray(body.images)) {
    badRequest("images must be an array");
  }
  const images = body.images ?? [];
  if ((images as unknown[]).length > MAX_IMAGES_PER_COLLECTION) {
    badRequest(`A collection can contain at most ${MAX_IMAGES_PER_COLLECTION} images`);
  }
  const parsedImages = (images as unknown[]).map((value, position) => ({
    position,
    ...parseImage(value),
  }));

  const collection = await prisma.slideshowImageCollection.create({
    data: {
      title,
      source,
      settings,
      images: parsedImages.length ? { create: parsedImages } : undefined,
    },
    include: collectionInclude,
  });
  return serializeCollection(collection);
}

export type UploadedSlideshowImage = {
  localPath: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  metadata?: JsonRecord;
};

export async function createUploadedSlideshowImageCollection(input: {
  title: string;
  images: UploadedSlideshowImage[];
  autoCaption?: boolean;
}) {
  const title = input.title.trim();
  if (!title) badRequest("name is required");
  if (title.length > 160) badRequest("name must be at most 160 characters");
  if (!input.images.length) badRequest("At least one image is required");
  if (input.images.length > MAX_IMAGES_PER_COLLECTION) {
    badRequest(`A collection can contain at most ${MAX_IMAGES_PER_COLLECTION} images`);
  }

  const collectionId = randomUUID();
  const images = input.images.map((image, position) => {
    const imageId = randomUUID();
    return {
      id: imageId,
      position,
      url: `/api/slideshows/image-collections/${collectionId}/images/${imageId}/file`,
      localPath: image.localPath,
      mimeType: image.mimeType,
      fileSizeBytes: image.fileSizeBytes,
      width: image.width ?? null,
      height: image.height ?? null,
      altText: image.altText ?? null,
      metadata: inputJson(image.metadata ?? {}),
    };
  });

  const collection = await prisma.slideshowImageCollection.create({
    data: {
      id: collectionId,
      title,
      source: "upload",
      settings: inputJson({ autoCaption: input.autoCaption ?? true }),
      images: { create: images },
    },
    include: collectionInclude,
  });
  return serializeCollection(collection);
}

export async function updateSlideshowImageCollection(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  const title =
    optionalString(body, "title", { max: 160 }) ??
    optionalString(body, "name", { max: 160 });
  const source = optionalString(body, "source", { max: 80 });
  const settings = optionalJsonObject(body, "settings");
  return prisma.$transaction(async (tx) => {
    await claimCollection(tx, id, revision);
    await tx.slideshowImageCollection.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(source !== undefined ? { source } : {}),
        ...(settings !== undefined ? { settings } : {}),
      },
    });
    return serializeCollection(await getCollectionRecord(id, tx));
  });
}

export async function deleteSlideshowImageCollection(id: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  const collection = await getCollectionRecord(id);
  await prisma.$transaction(async (tx) => {
    await claimCollection(tx, id, revision);
    await tx.slideshowImageCollection.delete({ where: { id } });
  });
  await Promise.allSettled(
    collection.images
      .map((image) => image.localPath)
      .filter((value): value is string => Boolean(value))
      .map((localPath) => storage.delete(localPath))
  );
}

export async function addSlideshowImages(collectionId: string, input: unknown) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  const rawImages = Array.isArray(body.images)
    ? body.images
    : body.image !== undefined
      ? [body.image]
      : [body];
  if (!rawImages.length) badRequest("At least one image is required");
  if (rawImages.length > 100) badRequest("At most 100 images can be added at once");

  return prisma.$transaction(async (tx) => {
    await claimCollection(tx, collectionId, revision);
    const collection = await getCollectionRecord(collectionId, tx);
    if (collection.images.length + rawImages.length > MAX_IMAGES_PER_COLLECTION) {
      badRequest(`A collection can contain at most ${MAX_IMAGES_PER_COLLECTION} images`);
    }
    for (let index = 0; index < rawImages.length; index += 1) {
      const parsed = parseImage(rawImages[index]);
      await tx.slideshowImage.create({
        data: {
          collectionId,
          position: collection.images.length + index,
          ...parsed,
        },
      });
    }
    return serializeCollection(await getCollectionRecord(collectionId, tx));
  });
}

export async function updateSlideshowImage(
  collectionId: string,
  imageId: string,
  input: unknown
) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  return prisma.$transaction(async (tx) => {
    await claimCollection(tx, collectionId, revision);
    const current = await tx.slideshowImage.findFirst({
      where: { id: imageId, collectionId },
    });
    if (!current) notFound("Image");
    const parsed = parseImage(body, current);
    await tx.slideshowImage.update({ where: { id: imageId }, data: parsed });
    return serializeCollection(await getCollectionRecord(collectionId, tx));
  });
}

export async function deleteSlideshowImage(
  collectionId: string,
  imageId: string,
  input: unknown
) {
  const body = requireRecord(input);
  const revision = requireRevision(body);
  const result = await prisma.$transaction(async (tx) => {
    await claimCollection(tx, collectionId, revision);
    const current = await tx.slideshowImage.findFirst({
      where: { id: imageId, collectionId },
      select: { id: true, localPath: true },
    });
    if (!current) notFound("Image");
    await tx.slideshowImage.delete({ where: { id: imageId } });
    const remaining = await tx.slideshowImage.findMany({
      where: { collectionId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await setImagePositions(
      tx,
      collectionId,
      remaining.map((image) => image.id)
    );
    return {
      collection: serializeCollection(await getCollectionRecord(collectionId, tx)),
      localPath: current.localPath,
    };
  });
  if (result.localPath) await storage.delete(result.localPath).catch(() => undefined);
  return result.collection;
}

export async function getSlideshowRenderProject(
  id: string
): Promise<SlideshowRenderProject> {
  const project = await getProjectRecord(id);
  const serialized = serializeSlideshowProject(project);
  const phaseSettings = recordOrEmpty(serialized.phaseSettings);
  const rawTextSettings = recordOrEmpty(serialized.textSettings);
  const style = readString(rawTextSettings.style, "outline");
  const position = readString(rawTextSettings.position, "center");
  const align = readString(rawTextSettings.align, "center");
  const color = readString(rawTextSettings.color, "white");
  const textSettings: NonNullable<SlideshowRenderProject["textSettings"]> = {
    font: readString(rawTextSettings.font, "Poppins"),
    color:
      color === "custom"
        ? readString(rawTextSettings.customColor, "#ffffff")
        : color,
    style:
      style === "solid" || style === "translucent" || style === "plain"
        ? style
        : ("outline" as const),
    size:
      typeof rawTextSettings.size === "number" ? rawTextSettings.size : 56,
    position:
      position === "top" || position === "bottom"
        ? position
        : ("center" as const),
    width:
      typeof rawTextSettings.width === "number" ? rawTextSettings.width : 88,
    align:
      align === "left" || align === "right" ? align : ("center" as const),
  };

  const generatedFileIds = project.slides
    .map((slide) => slide.generatedFileId)
    .filter((value): value is string => !!value);
  const generationJobIds = project.slides
    .map((slide) => slide.generationJobId)
    .filter((value): value is string => !!value);
  const generatedFiles =
    generatedFileIds.length || generationJobIds.length
      ? await prisma.generatedFile.findMany({
          where: {
            OR: [
              ...(generatedFileIds.length
                ? [{ id: { in: generatedFileIds } }]
                : []),
              ...(generationJobIds.length
                ? [{ jobId: { in: generationJobIds } }]
                : []),
            ],
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, jobId: true, localPath: true, data: true },
        })
      : [];
  const filesById = new Map(generatedFiles.map((file) => [file.id, file]));
  const firstFileByJob = new Map<string, (typeof generatedFiles)[number]>();
  for (const file of generatedFiles) {
    if (!firstFileByJob.has(file.jobId)) firstFileByJob.set(file.jobId, file);
  }

  const imageBuffers = new Map<string, Buffer>();
  await Promise.all(
    project.slides.map(async (slide) => {
      const file =
        (slide.generatedFileId ? filesById.get(slide.generatedFileId) : undefined) ??
        (slide.generationJobId
          ? firstFileByJob.get(slide.generationJobId)
          : undefined);
      if (!file) return;
      try {
        const buffer = file.localPath
          ? await storage.read(file.localPath)
          : file.data
            ? Buffer.from(file.data)
            : null;
        if (buffer?.length) imageBuffers.set(slide.id, buffer);
      } catch (error) {
        console.warn(
          `[slideshow-export] Could not load generated image ${file.id}:`,
          error
        );
      }
    })
  );

  const reusableImageUrls = Array.from(
    new Set(
      project.slides.flatMap((slide) => {
        const content = recordOrEmpty(slide.content);
        const imageUrls = Array.isArray(content.imageUrls)
          ? content.imageUrls.filter(
              (value): value is string => typeof value === "string"
            )
          : [];
        return [slide.imageUrl, ...imageUrls].filter(
          (value): value is string => Boolean(value)
        );
      })
    )
  );
  const reusableImages = reusableImageUrls.length
    ? await prisma.slideshowImage.findMany({
        where: {
          url: { in: reusableImageUrls },
          localPath: { not: null },
        },
        select: { url: true, localPath: true },
      })
    : [];
  const reusableImageBuffers = new Map<string, Buffer>();
  await Promise.all(
    reusableImages.map(async (image) => {
      if (!image.localPath) return;
      try {
        const buffer = await storage.read(image.localPath);
        if (buffer.length) reusableImageBuffers.set(image.url, buffer);
      } catch (error) {
        console.warn(
          `[slideshow-export] Could not load collection image ${image.url}:`,
          error
        );
      }
    })
  );

  return {
    id: project.id,
    title: project.title,
    aspectRatio: serialized.aspectRatio,
    textSettings,
    slides: project.slides.map((slide) => {
      const serializedSlide = serializeSlide(slide);
      const phase = serializedSlide.role;
      const phaseSetting = recordOrEmpty(phaseSettings[phase]);
      const reusableBuffers = serializedSlide.imageUrls.map(
        (url) => reusableImageBuffers.get(url) ?? null
      );
      const hasExplicitCollectionImages = serializedSlide.imageUrls.length > 0;
      return {
        id: slide.id,
        eyebrow: serializedSlide.eyebrow,
        headline: serializedSlide.headline,
        body: serializedSlide.body,
        imageUrl: slide.imageUrl,
        imageUrls: serializedSlide.imageUrls,
        imageBuffer:
          (hasExplicitCollectionImages
            ? reusableBuffers[0] ?? null
            : imageBuffers.get(slide.id) ??
              (slide.imageUrl ? reusableImageBuffers.get(slide.imageUrl) : null)) ??
          null,
        imageBuffers: reusableBuffers.some(Boolean) ? reusableBuffers : undefined,
        visualKey: serializedSlide.visualKey,
        visualKeys: serializedSlide.visualKeys,
        grid: readString(phaseSetting.grid, "none") as
          | "none"
          | "1:2"
          | "1:3"
          | "2:1"
          | "2:2",
        overlayEnabled:
          typeof phaseSetting.overlayEnabled === "boolean"
            ? phaseSetting.overlayEnabled
            : true,
        overlayOpacity:
          typeof phaseSetting.overlayOpacity === "number"
            ? phaseSetting.overlayOpacity
            : 45,
        displayText:
          typeof phaseSetting.displayText === "boolean"
            ? phaseSetting.displayText
            : true,
      };
    }),
  };
}
