import { randomUUID } from "crypto";

import type {
  Prisma,
  SlideshowSlideKind,
} from "@/generated/prisma/client";
import {
  buildSlideshowImageQueueRequest,
  submitReservedSlideshowImage,
} from "@/lib/ai/slideshow-image";
import {
  generateSlideshowStory,
  type SlideshowStoryInput,
} from "@/lib/ai/slideshow-story";
import { prisma } from "@/lib/db";
import {
  nextSlideshowAutomationRun,
  parseSlideshowAutomationSchedule,
} from "@/lib/slideshow/automation-schedule";
import {
  readSlideshowAutomationVisualSettings,
  shouldGenerateFreshAutomationVisuals,
} from "@/lib/slideshow/automation-visuals";
import {
  DEFAULT_PROJECT_LAYOUT,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SLIDE_CONTENT,
  DEFAULT_SLIDE_LAYOUT,
  DEFAULT_SLIDE_SETTINGS,
  MAX_SLIDES_PER_PROJECT,
} from "@/lib/slideshow/constants";
import { reserveSlideGenerationJob } from "@/lib/slideshow/service";

const DEFAULT_TICK_INTERVAL_MS = 30_000;
const CLAIM_LEASE_MS = 30 * 60_000;
const FAILED_RUN_RETRY_MS = 2 * 60_000;
const INVALID_SCHEDULE_RETRY_MS = 24 * 60 * 60_000;
const DEFAULT_BATCH_SIZE = 5;
const STALE_HEARTBEAT_MS = DEFAULT_TICK_INTERVAL_MS * 4;

const automationInclude = {
  project: {
    include: {
      slides: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
    },
  },
} satisfies Prisma.SlideshowAutomationInclude;

type AutomationCandidate = Prisma.SlideshowAutomationGetPayload<{
  include: typeof automationInclude;
}>;
type SourceProject = NonNullable<AutomationCandidate["project"]>;
type SourceSlide = SourceProject["slides"][number];
type ReusableCollectionImage = {
  id: string;
  url: string;
};

export type SlideshowAutomationFreshVisualDraft = {
  id: string;
  revision: number;
  settings: unknown;
  slides: Array<{
    id: string;
    imagePrompt: string | null;
    generationJobId?: string | null;
  }>;
};

export type SlideshowAutomationFreshVisualDependencies = {
  reserve: typeof reserveSlideGenerationJob;
  submit: typeof submitReservedSlideshowImage;
};

const productionFreshVisualDependencies: SlideshowAutomationFreshVisualDependencies = {
  reserve: reserveSlideGenerationJob,
  submit: submitReservedSlideshowImage,
};

const globalForAutomationWorker = globalThis as unknown as {
  __postforge_slideshow_automation_interval?: ReturnType<typeof setInterval> | null;
  __postforge_slideshow_automation_ticking?: boolean;
  __postforge_slideshow_automation_heartbeat?: number;
  __postforge_slideshow_automation_visual_tasks?: Set<Promise<void>>;
};

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function tickIntervalMs() {
  return positiveInteger(
    process.env.SLIDESHOW_AUTOMATION_TICK_MS,
    DEFAULT_TICK_INTERVAL_MS,
  );
}

function batchSize() {
  return positiveInteger(
    process.env.SLIDESHOW_AUTOMATION_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordOrEmpty(value: unknown) {
  return isRecord(value) ? value : {};
}

export function stripSlideshowClientId(value: unknown) {
  if (!isRecord(value)) return undefined;
  const result = { ...recordOrEmpty(value) };
  delete result.clientId;
  return result;
}

export function stripSlideshowProjectActivity(value: unknown) {
  const result = stripSlideshowClientId(value);
  if (!result) return undefined;
  delete result.successfulExportCount;
  delete result.lastExportedAt;
  delete result.lastExportFormat;
  delete result.exportHistory;
  return result;
}

export function copySlideshowAutomationSourceContent(
  value: unknown,
  reuseVisuals: boolean,
) {
  const result = stripSlideshowClientId(value) ?? {};
  if (!reuseVisuals) {
    // Preview and export intentionally prioritize explicit collection URLs.
    // Fresh-image runs must clear them so the newly attached generated file is
    // the active visual instead of a paid-but-hidden background.
    result.imageUrls = [];
    result.visualKeys = [];
  }
  return result;
}

function jsonObject(
  value: unknown,
  fallback: Record<string, unknown>,
): Prisma.InputJsonObject {
  const source = isRecord(value) ? value : fallback;
  return JSON.parse(JSON.stringify(source)) as Prisma.InputJsonObject;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function readSlideCount(value: unknown, fallback: number) {
  const count =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : fallback;
  return Math.max(1, Math.min(MAX_SLIDES_PER_PROJECT, count));
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function selectSlideshowAutomationHook(options: {
  automationId: string;
  scheduledFor: Date;
  hooks: string[];
  usedHooks: string[];
  preventRepeats: boolean;
}) {
  const hooks = options.hooks
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 500);
  const validHooks = new Set(hooks);
  const usedHooks = options.preventRepeats
    ? options.usedHooks
        .filter((hook, index, all) => validHooks.has(hook) && all.indexOf(hook) === index)
        .slice(-500)
    : [];
  const unusedHooks = hooks.filter((hook) => !usedHooks.includes(hook));
  const previousHook = usedHooks.at(-1);
  const eligibleHooks = unusedHooks.length
    ? unusedHooks
    : hooks.length > 1 && previousHook
      ? hooks.filter((hook) => hook !== previousHook)
      : hooks;
  const selectedHook = eligibleHooks.length
    ? eligibleHooks[
        hash(`${options.automationId}:${options.scheduledFor.toISOString()}`) %
          eligibleHooks.length
      ]
    : undefined;

  if (!options.preventRepeats || !selectedHook) return { selectedHook };
  return {
    selectedHook,
    nextUsedHooks: [
      ...(unusedHooks.length ? usedHooks : []),
      selectedHook,
    ].slice(-500),
  };
}

function hookPool(settings: Record<string, unknown>) {
  const source = settings.hookPool ?? settings.hooks ?? settings.hookList;
  const values = Array.isArray(source)
    ? source
    : typeof source === "string"
      ? source.split(/\r?\n/)
      : [];
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 500);
}

function usedHookPool(settings: Record<string, unknown>, hooks: string[]) {
  const used = Array.isArray(settings.usedHooks)
    ? settings.usedHooks
    : Array.isArray(settings.usedHookHistory)
      ? settings.usedHookHistory
      : [];
  const validHooks = new Set(hooks);
  return used
    .filter((value): value is string => typeof value === "string")
    .filter(
      (value, index, all) =>
        validHooks.has(value) && all.indexOf(value) === index,
    )
    .slice(-500);
}

function sourceHeadline(project: SourceProject | null) {
  const content = recordOrEmpty(project?.slides[0]?.content);
  return readString(content.headline) ?? readString(content.heading);
}

function storyPlanFor(automation: AutomationCandidate, scheduledFor: Date) {
  const content = recordOrEmpty(automation.contentSettings);
  const projectSettings = recordOrEmpty(automation.project?.settings);
  const hooks = hookPool(content);
  const preventRepeats =
    readBoolean(content.preventRepeats) ??
    readBoolean(projectSettings.preventRepeats) ??
    true;
  const usedHooks = preventRepeats ? usedHookPool(content, hooks) : [];
  const selection = selectSlideshowAutomationHook({
    automationId: automation.id,
    scheduledFor,
    hooks,
    usedHooks,
    preventRepeats,
  });
  const selectedHook = selection.selectedHook;
  const idea =
    selectedHook ??
    readString(content.idea) ??
    readString(content.topic) ??
    readString(content.subject) ??
    readString(content.prompt) ??
    sourceHeadline(automation.project) ??
    readString(automation.project?.description) ??
    readString(automation.project?.title) ??
    automation.name;
  const sourceSlideCount = automation.project?.slides.length || 7;

  const input: SlideshowStoryInput = {
    idea,
    slideCount: readSlideCount(content.slideCount, sourceSlideCount),
    language:
      readString(content.language) ??
      readString(projectSettings.language) ??
      "English",
    tone: readString(content.tone),
    audience: readString(content.audience),
    includeCta:
      readBoolean(content.includeCta) ??
      readBoolean(projectSettings.includeCta) ??
      true,
  };

  if (!selection.nextUsedHooks) return { input };
  return {
    input,
    nextContentSettings: jsonObject(
      {
        ...content,
        usedHooks: selection.nextUsedHooks,
      },
      {},
    ),
  };
}

function sourceSlideFor(
  source: SourceProject | null,
  position: number,
  kind: SlideshowSlideKind,
): SourceSlide | undefined {
  return (
    source?.slides[position] ??
    source?.slides.find((slide) => slide.kind === kind) ??
    source?.slides.at(-1)
  );
}

async function reusableCollectionImages(
  contentSettings: unknown,
): Promise<ReusableCollectionImage[]> {
  const { policy, imageCollectionId } =
    readSlideshowAutomationVisualSettings(contentSettings);
  if (policy !== "reuse" || !imageCollectionId) return [];

  const collection = await prisma.slideshowImageCollection.findUnique({
    where: { id: imageCollectionId },
    select: {
      images: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, url: true },
      },
    },
  });
  return collection?.images ?? [];
}

function generatedSlideData(
  source: SourceProject | null,
  story: Awaited<ReturnType<typeof generateSlideshowStory>>,
  options: {
    reuseVisuals: boolean;
    collectionImages: ReusableCollectionImage[];
  },
) {
  return story.slides.map((slide, position) => {
    const kind: SlideshowSlideKind =
      slide.role === "body" ? "content" : slide.role;
    const sourceSlide = sourceSlideFor(source, position, kind);
    const collectionImage = options.collectionImages.length
      ? options.collectionImages[position % options.collectionImages.length]
      : undefined;
    const sourceContent = copySlideshowAutomationSourceContent(
      sourceSlide?.content,
      options.reuseVisuals,
    );
    const eyebrow =
      slide.role === "hook"
        ? "Hook"
        : slide.role === "cta"
          ? "Call to action"
          : `Point ${position + 1}`;
    return {
      position,
      kind,
      // Reuse is intentionally the default and makes no paid request. A
      // hook-pool-only automation can cycle through one saved collection.
      imageUrl: options.reuseVisuals
        ? (sourceSlide?.imageUrl ?? collectionImage?.url ?? null)
        : null,
      imagePrompt: slide.imagePrompt,
      generationJobId: options.reuseVisuals
        ? (sourceSlide?.generationJobId ?? null)
        : null,
      generatedFileId: options.reuseVisuals
        ? (sourceSlide?.generatedFileId ?? null)
        : null,
      sourceImageId: options.reuseVisuals
        ? (sourceSlide?.sourceImageId ?? collectionImage?.id ?? null)
        : null,
      content: jsonObject(
        {
          ...sourceContent,
          eyebrow,
          headline: slide.heading,
          body: slide.body,
          textItems: [
            { id: `automation-${position}-eyebrow`, role: "eyebrow", text: eyebrow },
            {
              id: `automation-${position}-headline`,
              role: "headline",
              text: slide.heading,
            },
            { id: `automation-${position}-body`, role: "body", text: slide.body },
          ],
        },
        DEFAULT_SLIDE_CONTENT,
      ),
      settings: jsonObject(sourceSlide?.settings, DEFAULT_SLIDE_SETTINGS),
      layout: jsonObject(sourceSlide?.layout, DEFAULT_SLIDE_LAYOUT),
    };
  });
}

export async function queueSlideshowAutomationFreshVisuals(
  draft: SlideshowAutomationFreshVisualDraft,
  contentSettings: unknown,
  dependencies: SlideshowAutomationFreshVisualDependencies =
    productionFreshVisualDependencies,
) {
  if (!shouldGenerateFreshAutomationVisuals(contentSettings)) return;

  const { imageModel } = readSlideshowAutomationVisualSettings(contentSettings);
  const projectSettings = recordOrEmpty(draft.settings);
  const aspectRatio = readString(projectSettings.aspectRatio) ?? "9:16";
  let revision = draft.revision;

  // Automation-created drafts already carry atomically persisted job intents.
  // The reserve fallback keeps this helper useful for older/manual callers.
  // Submitting each intent before moving on prevents a later reservation error
  // from leaving all earlier jobs in the queued state.
  for (const slide of draft.slides) {
    if (!slide.imagePrompt?.trim()) continue;
    const request = buildSlideshowImageQueueRequest({
      projectId: draft.id,
      slideId: slide.id,
      prompt: slide.imagePrompt,
      aspectRatio,
      model: imageModel,
    });
    let jobId = slide.generationJobId ?? null;
    if (!jobId) {
      const reservation = await dependencies.reserve(
        draft.id,
        slide.id,
        revision,
        {
          model: request.model,
          prompt: request.prompt,
          input: request.jobInput,
          estimatedCost: request.estimatedCost,
          tags: request.tags,
        },
      );
      revision = reservation.projectRevision;
      jobId = reservation.jobId;
    }
    await dependencies.submit(jobId, request);
  }
}

export function launchSlideshowAutomationFreshVisuals(
  draft: SlideshowAutomationFreshVisualDraft,
  contentSettings: unknown,
  dependencies: SlideshowAutomationFreshVisualDependencies =
    productionFreshVisualDependencies,
) {
  if (!shouldGenerateFreshAutomationVisuals(contentSettings)) return false;

  const task = queueSlideshowAutomationFreshVisuals(
    draft,
    contentSettings,
    dependencies,
  ).catch((error) => {
    console.error(
      `[slideshow-automation-worker] Fresh visuals for draft ${draft.id} failed:`,
      error,
    );
  });
  const tasks =
    globalForAutomationWorker.__postforge_slideshow_automation_visual_tasks ??
    new Set<Promise<void>>();
  globalForAutomationWorker.__postforge_slideshow_automation_visual_tasks = tasks;
  tasks.add(task);
  void task.finally(() => tasks.delete(task));
  return true;
}

function isWorkerRunning() {
  if (!globalForAutomationWorker.__postforge_slideshow_automation_interval) {
    return false;
  }
  const heartbeat =
    globalForAutomationWorker.__postforge_slideshow_automation_heartbeat ?? 0;
  if (Date.now() - heartbeat > STALE_HEARTBEAT_MS) {
    globalForAutomationWorker.__postforge_slideshow_automation_interval = null;
    return false;
  }
  return true;
}

export function ensureSlideshowAutomationWorkerRunning(): void {
  if (process.env.SLIDESHOW_AUTOMATION_WORKER_DISABLED === "1") return;
  if (isWorkerRunning()) return;

  globalForAutomationWorker.__postforge_slideshow_automation_ticking = false;
  globalForAutomationWorker.__postforge_slideshow_automation_heartbeat = Date.now();
  const interval = setInterval(() => {
    globalForAutomationWorker.__postforge_slideshow_automation_heartbeat = Date.now();
    runSlideshowAutomationTick().catch((error) => {
      console.error("[slideshow-automation-worker] Tick failed:", error);
    });
  }, tickIntervalMs());
  // The worker should not keep a one-off Node process alive on its own.
  interval.unref?.();
  globalForAutomationWorker.__postforge_slideshow_automation_interval = interval;

  // The immediate query recovers due rows and expired claim leases after restart.
  runSlideshowAutomationTick().catch((error) => {
    console.error("[slideshow-automation-worker] Initial tick failed:", error);
  });
}

export function stopSlideshowAutomationWorker(): void {
  const interval =
    globalForAutomationWorker.__postforge_slideshow_automation_interval;
  if (interval) clearInterval(interval);
  globalForAutomationWorker.__postforge_slideshow_automation_interval = null;
}

async function deferInvalidSchedule(
  automation: AutomationCandidate,
  now: Date,
  error: unknown,
) {
  const deferredUntil = new Date(now.getTime() + INVALID_SCHEDULE_RETRY_MS);
  await prisma.slideshowAutomation.updateMany({
    where: {
      id: automation.id,
      status: "active",
      revision: automation.revision,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    data: {
      revision: { increment: 1 },
      nextRunAt: deferredUntil,
    },
  });
  console.error(
    `[slideshow-automation-worker] Deferred automation ${automation.id}:`,
    error,
  );
}

async function claimDueAutomation(
  automation: AutomationCandidate,
  now: Date,
) {
  const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS);
  const result = await prisma.slideshowAutomation.updateMany({
    where: {
      id: automation.id,
      status: "active",
      revision: automation.revision,
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    data: {
      revision: { increment: 1 },
      nextRunAt: leaseUntil,
    },
  });
  return result.count === 1
    ? { revision: automation.revision + 1, leaseUntil }
    : null;
}

async function releaseClaimForRetry(
  automationId: string,
  claimedRevision: number,
) {
  await prisma.slideshowAutomation.updateMany({
    where: {
      id: automationId,
      status: "active",
      revision: claimedRevision,
    },
    data: {
      revision: { increment: 1 },
      nextRunAt: new Date(Date.now() + FAILED_RUN_RETRY_MS),
    },
  });
}

async function processDueAutomation(
  automation: AutomationCandidate,
  now: Date,
) {
  let nextRunAt: Date;
  try {
    parseSlideshowAutomationSchedule(automation.schedule);
    nextRunAt = nextSlideshowAutomationRun(automation.schedule, now);
  } catch (error) {
    await deferInvalidSchedule(automation, now, error);
    return;
  }

  const claim = await claimDueAutomation(automation, now);
  if (!claim) return;

  try {
    const scheduledFor = automation.nextRunAt ?? now;
    // generateSlideshowStory calls Gemini when configured and always preserves
    // the deterministic local fallback when the external provider is unavailable.
    const storyPlan = storyPlanFor(automation, scheduledFor);
    const story = await generateSlideshowStory(storyPlan.input);
    const visualSettings = readSlideshowAutomationVisualSettings(
      automation.contentSettings,
    );
    const collectionImages = await reusableCollectionImages(
      automation.contentSettings,
    );
    const slides = generatedSlideData(automation.project, story, {
      reuseVisuals: visualSettings.policy === "reuse",
      collectionImages,
    });
    const projectSettings = jsonObject(
      {
        ...(stripSlideshowProjectActivity(automation.project?.settings) ??
          DEFAULT_PROJECT_SETTINGS),
        caption: story.caption,
        generationProvider: story.provider,
        generationWarning: story.warning ?? null,
      },
      DEFAULT_PROJECT_SETTINGS,
    );
    const projectLayout = jsonObject(
      automation.project?.layout,
      DEFAULT_PROJECT_LAYOUT,
    );
    const currentContentSettings = recordOrEmpty(automation.contentSettings);
    const previousRunHistory = Array.isArray(currentContentSettings.runHistory)
      ? currentContentSettings.runHistory.filter(
          (value): value is string =>
            typeof value === "string" && Number.isFinite(Date.parse(value)),
        )
      : [];
    const previousRunCount =
      typeof currentContentSettings.successfulRunCount === "number" &&
      Number.isSafeInteger(currentContentSettings.successfulRunCount) &&
      currentContentSettings.successfulRunCount >= 0
        ? currentContentSettings.successfulRunCount
        : previousRunHistory.length;
    const completedContentSettings = jsonObject(
      {
        ...recordOrEmpty(
          storyPlan.nextContentSettings ?? automation.contentSettings,
        ),
        successfulRunCount: previousRunCount + 1,
        runHistory: [...previousRunHistory, now.toISOString()].slice(-500),
      },
      {},
    );
    const draftId = randomUUID();
    const draftSlides = slides.map((slide) => ({
      ...slide,
      id: randomUUID(),
    }));
    const draftAspectRatio =
      readString(recordOrEmpty(projectSettings).aspectRatio) ?? "9:16";
    const freshVisualIntents =
      visualSettings.policy === "fresh-ai"
        ? draftSlides.flatMap((slide) => {
            if (!slide.imagePrompt?.trim()) return [];
            const request = buildSlideshowImageQueueRequest({
              projectId: draftId,
              slideId: slide.id,
              prompt: slide.imagePrompt,
              aspectRatio: draftAspectRatio,
              model: visualSettings.imageModel,
            });
            return [{ slideId: slide.id, jobId: randomUUID(), request }];
          })
        : [];
    const freshVisualJobBySlideId = new Map(
      freshVisualIntents.map((intent) => [intent.slideId, intent.jobId]),
    );
    const persistedSlides = draftSlides.map((slide) => ({
      ...slide,
      generationJobId:
        freshVisualJobBySlideId.get(slide.id) ?? slide.generationJobId,
    }));

    const draft = await prisma.$transaction(async (tx) => {
      const completed = await tx.slideshowAutomation.updateMany({
        where: {
          id: automation.id,
          status: "active",
          revision: claim.revision,
        },
        data: {
          revision: { increment: 1 },
          lastRunAt: now,
          nextRunAt,
          contentSettings: completedContentSettings,
        },
      });
      // A pause/edit after the claim invalidates its revision. In that case the
      // generated copy is intentionally discarded rather than publishing stale work.
      if (completed.count !== 1) return null;

      // These queued rows are the durable outbox. The cadence update, review
      // draft, slide links, and every paid-image intent either commit together
      // or all roll back. A later cron can submit them even if this invocation
      // stops immediately after the transaction commits.
      if (freshVisualIntents.length) {
        await tx.generationJob.createMany({
          data: freshVisualIntents.map(({ jobId, request }) => ({
            id: jobId,
            type: "image",
            model: request.model,
            status: "queued",
            prompt: request.prompt,
            input: jsonObject(request.jobInput, {}),
            estimatedCost: request.estimatedCost,
            tags: request.tags,
          })),
        });
      }

      return tx.slideshowProject.create({
        data: {
          id: draftId,
          title: story.title.slice(0, 160),
          description: story.caption,
          status: "draft",
          settings: projectSettings,
          layout: projectLayout,
          slides: { create: persistedSlides },
        },
        include: {
          slides: {
            orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });
    if (draft) {
      await queueSlideshowAutomationFreshVisuals(
        {
          id: draft.id,
          revision: draft.revision,
          settings: draft.settings,
          slides: draft.slides.map((slide) => ({
            id: slide.id,
            imagePrompt: slide.imagePrompt,
            generationJobId: slide.generationJobId,
          })),
        },
        automation.contentSettings,
      ).catch((error) => {
        // The copy draft has already committed atomically with the automation
        // cadence. Keep it, and let the durable image recovery worker submit or
        // retry the queued intents persisted in the same transaction.
        console.error(
          `[slideshow-automation-worker] Fresh visuals for draft ${draft.id} failed:`,
          error,
        );
      });
    }
  } catch (error) {
    await releaseClaimForRetry(automation.id, claim.revision);
    console.error(
      `[slideshow-automation-worker] Automation ${automation.id} failed:`,
      error,
    );
  }
}

export async function runSlideshowAutomationTick(): Promise<void> {
  if (globalForAutomationWorker.__postforge_slideshow_automation_ticking) return;
  globalForAutomationWorker.__postforge_slideshow_automation_ticking = true;

  try {
    const now = new Date();
    const due = await prisma.slideshowAutomation.findMany({
      where: {
        status: "active",
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
      },
      include: automationInclude,
      orderBy: [{ nextRunAt: "asc" }, { createdAt: "asc" }],
      take: batchSize(),
    });

    await Promise.allSettled(
      due.map((automation) => processDueAutomation(automation, now)),
    );
  } finally {
    globalForAutomationWorker.__postforge_slideshow_automation_ticking = false;
  }
}
