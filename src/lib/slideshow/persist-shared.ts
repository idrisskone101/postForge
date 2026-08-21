import type {
  Prisma,
  SlideshowSlideKind,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  DEFAULT_PROJECT_LAYOUT,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SLIDE_CONTENT,
  DEFAULT_SLIDE_LAYOUT,
  DEFAULT_SLIDE_SETTINGS,
  SLIDESHOW_SLIDE_KINDS,
  type SlideshowSlideKindValue,
} from "@/lib/slideshow/constants";
import { badRequest, notFound, revisionConflict } from "@/lib/slideshow/errors";
import { canonicalizePhaseSettings } from "@/lib/slideshow/project-settings";
import {
  cloneJson,
  isRecord,
  optionalEnum,
  optionalId,
  optionalJsonObject,
  optionalString,
  requireRecord,
  type JsonRecord,
} from "@/lib/slideshow/validation";

export const projectInclude = {
  slides: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
} satisfies Prisma.SlideshowProjectInclude;

export type SlideshowProjectRecord = Prisma.SlideshowProjectGetPayload<{
  include: typeof projectInclude;
}>;
export type SlideshowSlideRecord = SlideshowProjectRecord["slides"][number];
export type SlideshowTransaction = Prisma.TransactionClient;

export function recordOrEmpty(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

export function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function inputJson(value: unknown): Prisma.InputJsonValue {
  return cloneJson(value) as Prisma.InputJsonValue;
}

export function mergeRecord(base: unknown, patch: unknown): JsonRecord {
  const baseRecord = recordOrEmpty(base);
  const patchRecord = recordOrEmpty(patch);
  return { ...cloneJson(baseRecord), ...cloneJson(patchRecord) };
}

export function jsonWithoutClientId(value: unknown): Prisma.InputJsonValue {
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

export function projectSettingsFrom(
  body: JsonRecord,
  current: unknown = DEFAULT_PROJECT_SETTINGS,
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

  result.phaseSettings = canonicalizePhaseSettings(result.phaseSettings);

  return inputJson(result);
}

export function projectLayoutFrom(
  body: JsonRecord,
  current: unknown = DEFAULT_PROJECT_LAYOUT,
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
  current: unknown = DEFAULT_SLIDE_CONTENT,
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
  current: unknown = DEFAULT_SLIDE_SETTINGS,
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
  current: unknown = DEFAULT_SLIDE_LAYOUT,
): Prisma.InputJsonValue {
  const explicit = optionalJsonObject(body, "layout");
  return inputJson(mergeRecord(current, explicit));
}

function nullableStringAlias(
  body: JsonRecord,
  canonicalKey: string,
  aliasKey?: string,
  max = 2_000,
) {
  if (body[canonicalKey] !== undefined) {
    return optionalString(body, canonicalKey, { max, nullable: true });
  }
  if (aliasKey && body[aliasKey] !== undefined) {
    return optionalString(body, aliasKey, { max, nullable: true });
  }
  return undefined;
}

export function optionalDescription(body: JsonRecord) {
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

export function parseFullSlide(
  value: unknown,
  current?: SlideshowSlideRecord,
): ParsedSlide {
  const body = requireRecord(value, "slide");
  const id = optionalId(body, "id");
  return {
    ...(id ? { id } : {}),
    kind: slideKindFrom(
      body,
      (current?.kind as SlideshowSlideKindValue | undefined) ?? "content",
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

export function serializeSlide(slide: SlideshowSlideRecord) {
  const content = recordOrEmpty(slide.content);
  const settings = recordOrEmpty(slide.settings);
  const textItems = Array.isArray(content.textItems) ? content.textItems : [];
  const firstTextItem = textItems.find(isRecord);
  const fallbackHeadline = readString(firstTextItem?.text);
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
    eyebrow: readString(content.eyebrow),
    headline: readString(content.headline, fallbackHeadline),
    body: readString(content.body),
    imageUrl: slide.imageUrl,
    imageUrls,
    imagePrompt: slide.imagePrompt,
    prompt: slide.imagePrompt ?? "",
    visualKey: readString(
      content.visualKey,
      readString(settings.visualKey, `slide-${(slide.position % 8) + 1}`),
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

export function toSlideshowProjectDto(project: SlideshowProjectRecord) {
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
    phaseSettings: canonicalizePhaseSettings(
      settings.phaseSettings ?? defaults.phaseSettings,
    ),
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

export async function getProjectRecord(
  id: string,
  tx: SlideshowTransaction | typeof prisma = prisma,
) {
  const project = await tx.slideshowProject.findUnique({
    where: { id },
    include: projectInclude,
  });
  if (!project) notFound("Slideshow");
  return project;
}

export async function claimProject(
  tx: SlideshowTransaction,
  id: string,
  expectedRevision: number,
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

export function slideCreateData(parsed: ParsedSlide) {
  return {
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
}
