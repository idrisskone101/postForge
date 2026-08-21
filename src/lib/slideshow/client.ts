import {
  LIST_PREVIEW_SLIDE_COUNT,
  type SlideshowProjectListItem,
  type SlideshowProjectListPage,
} from "@/lib/slideshow/list-types";
import {
  SLIDESHOW_PROJECT_STATUSES,
  type SlideshowProjectStatusValue,
} from "@/lib/slideshow/constants";

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

export const SLIDESHOW_LIST_PAGE_SIZE = 20;
const SLIDESHOW_DRAIN_PAGE_LIMIT = 100;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : fallback;
}

function parseStatus(value: unknown): SlideshowProjectStatusValue {
  const status = asString(value);
  return (SLIDESHOW_PROJECT_STATUSES as readonly string[]).includes(status)
    ? (status as SlideshowProjectStatusValue)
    : "draft";
}

function parsePreviewImageUrls(value: unknown): Array<string | null> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, LIST_PREVIEW_SLIDE_COUNT).map((item) =>
    typeof item === "string" && item.length > 0 ? item : null,
  );
}

export function parseSlideshowProjectListItem(
  input: unknown,
): SlideshowProjectListItem {
  const record = isRecord(input) ? input : {};
  const id = asString(record.id);
  const title = asString(record.title, "Untitled slideshow");
  const clientId = asString(record.clientId);
  return {
    id,
    ...(clientId ? { clientId } : {}),
    title,
    description:
      typeof record.description === "string" ? record.description : undefined,
    status: parseStatus(record.status),
    revision: asNonNegativeInteger(record.revision, 1),
    aspectRatio: asString(record.aspectRatio, "9:16"),
    slideCount: asNonNegativeInteger(record.slideCount, 0),
    previewImageUrls: parsePreviewImageUrls(record.previewImageUrls),
    successfulExportCount: asNonNegativeInteger(
      record.successfulExportCount,
      0,
    ),
    lastExportedAt:
      typeof record.lastExportedAt === "string" &&
      Number.isFinite(Date.parse(record.lastExportedAt))
        ? record.lastExportedAt
        : null,
    createdAt: asString(record.createdAt),
    updatedAt: asString(record.updatedAt),
  };
}

export function parseSlideshowProjectListPage(
  input: unknown,
  fallback: { limit: number; offset: number },
): SlideshowProjectListPage {
  const record = isRecord(input) ? input : {};
  const reportedTotal = record.total;
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
  const rawProjects = Array.isArray(record.projects) ? record.projects : [];
  return {
    projects: rawProjects.map(parseSlideshowProjectListItem),
    total: reportedTotal,
    limit: asNonNegativeInteger(record.limit, fallback.limit),
    offset: asNonNegativeInteger(record.offset, fallback.offset),
  };
}

export function slideshowProjectListItemFromDetail(project: {
  id: string;
  clientId?: string;
  title: string;
  description?: string;
  status: SlideshowProjectListItem["status"];
  revision?: number;
  aspectRatio: string;
  slides: Array<{ imageUrl?: string | null }>;
  successfulExportCount?: number;
  lastExportedAt?: string | null;
  createdAt?: string;
  updatedAt: string;
}): SlideshowProjectListItem {
  return {
    id: project.id,
    ...(project.clientId ? { clientId: project.clientId } : {}),
    title: project.title,
    description: project.description,
    status: project.status,
    revision: project.revision ?? 1,
    aspectRatio: project.aspectRatio,
    slideCount: project.slides.length,
    previewImageUrls: project.slides
      .slice(0, LIST_PREVIEW_SLIDE_COUNT)
      .map((slide) => slide.imageUrl ?? null),
    successfulExportCount: project.successfulExportCount ?? 0,
    lastExportedAt: project.lastExportedAt ?? null,
    createdAt: project.createdAt ?? project.updatedAt,
    updatedAt: project.updatedAt,
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

function paginatedUrl(endpoint: string, offset: number, limit: number) {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}limit=${limit}&offset=${offset}`;
}

export async function fetchAllSlideshowPages(
  endpoint: string,
  collectionKey: "projects" | "automations",
) {
  const items: unknown[] = [];
  let total: number | null = null;

  for (
    let offset = 0;
    total === null || offset < total;
    offset += SLIDESHOW_DRAIN_PAGE_LIMIT
  ) {
    const response = await fetch(
      paginatedUrl(endpoint, offset, SLIDESHOW_DRAIN_PAGE_LIMIT),
      { cache: "no-store" },
    );
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

export async function fetchSlideshowProjectPage(options: {
  apiBaseUrl?: string;
  status?: string | null;
  limit?: number;
  offset?: number;
} = {}): Promise<SlideshowProjectListPage> {
  const apiBaseUrl = options.apiBaseUrl ?? "/api/slideshows";
  const limit = options.limit ?? SLIDESHOW_LIST_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (options.status) params.set("status", options.status);
  const response = await fetch(`${apiBaseUrl}?${params.toString()}`, {
    cache: "no-store",
  });
  return parseSlideshowProjectListPage(await readJsonResponse(response), {
    limit,
    offset,
  });
}

export async function fetchSlideshowProjects(
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowProjectListItem[]> {
  const page = await fetchSlideshowProjectPage({ apiBaseUrl });
  return page.projects;
}

export async function fetchAllSlideshowProjectPages(
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowProjectListItem[]> {
  const items = await fetchAllSlideshowPages(apiBaseUrl, "projects");
  return items.map(parseSlideshowProjectListItem);
}
