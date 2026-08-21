import type {
  Prisma,
  SlideshowAutomationStatus,
} from "@/generated/prisma/client";
import { getModel } from "@/lib/ai/models";
import { prisma } from "@/lib/db";
import {
  nextSlideshowAutomationRun,
  parseSlideshowAutomationSchedule,
} from "@/lib/slideshow/automation-schedule";
import {
  readSlideshowAutomationVisualSettings,
  SLIDESHOW_AUTOMATION_VISUAL_POLICIES,
} from "@/lib/slideshow/automation-visuals";
import { SLIDESHOW_AUTOMATION_STATUSES } from "@/lib/slideshow/constants";
import { badRequest, notFound, revisionConflict } from "@/lib/slideshow/errors";
import { platformCollectionExists } from "@/lib/slideshow/platform-collections";
import {
  inputJson,
  readString,
  recordOrEmpty,
  type SlideshowTransaction,
} from "@/lib/slideshow/persist-shared";
import {
  cloneJson,
  optionalEnum,
  optionalId,
  optionalJsonObject,
  optionalNullableDate,
  optionalString,
  requiredString,
  requireRecord,
  requireRevision,
} from "@/lib/slideshow/validation";

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
      "invalid_schedule",
    );
  }
}

function nextAutomationRun(value: unknown, after = new Date()) {
  try {
    return nextSlideshowAutomationRun(value, after);
  } catch (error) {
    badRequest(
      error instanceof Error ? error.message : "Automation schedule is invalid",
      "invalid_schedule",
    );
  }
}

function serializeAutomation(
  automation: Prisma.SlideshowAutomationGetPayload<Record<string, never>>,
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
  tx: SlideshowTransaction,
  id: string,
  expectedRevision: number,
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
    if (!(await platformCollectionExists(visualSettings.imageCollectionId))) {
      badRequest(
        "imageCollectionId does not reference an existing platform image collection",
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
        SLIDESHOW_AUTOMATION_STATUSES,
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
    },
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
