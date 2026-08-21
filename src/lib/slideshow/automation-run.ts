import { randomUUID } from "crypto";

import { getDefaultModel } from "@/lib/ai/model-availability";
import { buildSlideshowImageQueueRequest } from "@/lib/ai/slideshow-image";
import { generateSlideshowStory } from "@/lib/ai/slideshow-story";
import { prisma } from "@/lib/db";
import {
  jsonObject,
  recordOrEmpty,
  readString,
  stripSlideshowProjectActivity,
} from "@/lib/slideshow/automation-copy";
import {
  generatedSlideData,
  reusableCollectionImages,
  storyPlanFor,
  type AutomationCandidate,
} from "@/lib/slideshow/automation-draft";
import { queueSlideshowAutomationFreshVisuals } from "@/lib/slideshow/automation-fresh-visuals";
import {
  nextSlideshowAutomationRun,
  parseSlideshowAutomationSchedule,
} from "@/lib/slideshow/automation-schedule";
import { readSlideshowAutomationVisualSettings } from "@/lib/slideshow/automation-visuals";
import {
  DEFAULT_PROJECT_LAYOUT,
  DEFAULT_PROJECT_SETTINGS,
} from "@/lib/slideshow/constants";

const CLAIM_LEASE_MS = 30 * 60_000;
const FAILED_RUN_RETRY_MS = 2 * 60_000;
const INVALID_SCHEDULE_RETRY_MS = 24 * 60 * 60_000;

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

export async function processDueAutomation(
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
    const resolvedVisualImageModel =
      visualSettings.imageModel || (await getDefaultModel("image"));
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
              model: resolvedVisualImageModel,
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
