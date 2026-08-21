import type { Prisma, SlideshowProjectStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  DEFAULT_PROJECT_SETTINGS,
  SLIDESHOW_PROJECT_STATUSES,
} from "@/lib/slideshow/constants";
import { isRecord, optionalEnum } from "@/lib/slideshow/validation";
import {
  LIST_PREVIEW_SLIDE_COUNT,
  type SlideshowProjectListItem,
  type SlideshowProjectListPage,
} from "@/lib/slideshow/list-types";

const listProjectInclude = {
  _count: { select: { slides: true } },
  slides: {
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    take: LIST_PREVIEW_SLIDE_COUNT,
    select: { imageUrl: true },
  },
} satisfies Prisma.SlideshowProjectInclude;

type ListProjectRecord = Prisma.SlideshowProjectGetPayload<{
  include: typeof listProjectInclude;
}>;

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function toSlideshowProjectListDto(
  project: ListProjectRecord,
): SlideshowProjectListItem {
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
    description: project.description ?? undefined,
    status: project.status,
    revision: project.revision,
    aspectRatio: readString(settings.aspectRatio, defaults.aspectRatio),
    slideCount: project._count.slides,
    previewImageUrls: project.slides.map((slide) => slide.imageUrl ?? null),
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
        : (exportHistory.at(-1) ?? null),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function listSlideshowProjects(options: {
  status?: string | null;
  limit: number;
  offset: number;
}): Promise<SlideshowProjectListPage> {
  const status = options.status
    ? optionalEnum({ status: options.status }, "status", SLIDESHOW_PROJECT_STATUSES)
    : undefined;
  const where = status
    ? { status: status as SlideshowProjectStatus }
    : undefined;
  const [projects, total] = await Promise.all([
    prisma.slideshowProject.findMany({
      where,
      include: listProjectInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: options.limit,
      skip: options.offset,
    }),
    prisma.slideshowProject.count({ where }),
  ]);

  return {
    projects: projects.map(toSlideshowProjectListDto),
    total,
    limit: options.limit,
    offset: options.offset,
  };
}
