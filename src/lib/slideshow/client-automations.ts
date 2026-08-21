import type { SlideshowAutomation } from "@/components/slideshow/types";
import { isLocalSlideshowId } from "@/components/slideshow/types";
import {
  SlideshowApiError,
  asNumber,
  asString,
  isRecord,
  readJsonResponse,
  unwrapProject,
  type JsonRecord,
} from "@/lib/slideshow/client-request";

const SLIDESHOW_PAGE_LIMIT = 100;

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

function paginatedUrl(endpoint: string, offset: number) {
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}limit=${SLIDESHOW_PAGE_LIMIT}&offset=${offset}`;
}

async function fetchAllSlideshowPages(endpoint: string) {
  const items: unknown[] = [];
  let total: number | null = null;

  for (let offset = 0; total === null || offset < total; offset += SLIDESHOW_PAGE_LIMIT) {
    const response = await fetch(paginatedUrl(endpoint, offset), {
      cache: "no-store",
    });
    const data = await readJsonResponse(response);
    const page =
      isRecord(data) && Array.isArray(data.automations) ? data.automations : [];

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

export async function fetchSlideshowAutomations(
  apiBaseUrl = "/api/slideshows",
): Promise<SlideshowAutomation[]> {
  const items = await fetchAllSlideshowPages(`${apiBaseUrl}/automations`);
  return items
    .filter(isRecord)
    .map((item) => deserializeAutomation(item));
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
