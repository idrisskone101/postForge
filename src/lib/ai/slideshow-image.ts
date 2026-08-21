import { prisma } from "@/lib/db";
import { getModel } from "./models";
import type { GenerationJob } from "@/generated/prisma/client";
import type { SlideshowImageQueueRequest } from "./slideshow-image-queue";
import {
  submitReservedSlideshowImage,
  productionSlideshowImageSubmissionDependencies,
  type SlideshowImageSubmissionResult,
} from "./slideshow-image-submit";

export {
  buildSlideshowImagePrompt,
  buildSlideshowImageQueueRequest,
  slideshowImageAspectRatios,
  type QueueSlideshowImageInput,
  type SlideshowImageQueueRequest,
} from "./slideshow-image-queue";
export {
  submitReservedSlideshowImage,
  type SlideshowImageSubmissionDependencies,
  type SlideshowImageSubmissionResult,
} from "./slideshow-image-submit";

type PersistedQueuedSlideshowImageJob = Pick<
  GenerationJob,
  | "id"
  | "model"
  | "prompt"
  | "input"
  | "estimatedCost"
  | "tags"
  | "attempts"
>;

export type QueuedSlideshowImageRecoveryResult = {
  candidates: number;
  claimed: number;
  submitted: number;
  persisted: number;
  failed: number;
  skipped: number;
  errors: number;
};

export type QueuedSlideshowImageRecoveryDependencies = {
  now: () => Date;
  listQueuedJobs: (
    limit: number,
    now: Date,
  ) => Promise<PersistedQueuedSlideshowImageJob[]>;
  submit: (
    jobId: string,
    request: SlideshowImageQueueRequest,
  ) => Promise<SlideshowImageSubmissionResult>;
  failQueuedJob: (
    jobId: string,
    error: string,
    completedAt: Date,
  ) => Promise<boolean>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function restorePersistedSlideshowImageQueueRequest(
  job: PersistedQueuedSlideshowImageJob,
): SlideshowImageQueueRequest {
  if (!isRecord(job.input) || job.input.kind !== "slideshow-slide-image") {
    throw new Error("Queued slideshow image intent has an invalid kind");
  }
  if (
    typeof job.input.projectId !== "string" ||
    !job.input.projectId.trim() ||
    typeof job.input.slideId !== "string" ||
    !job.input.slideId.trim()
  ) {
    throw new Error("Queued slideshow image intent is missing its project or slide");
  }
  if (!isRecord(job.input.falInput)) {
    throw new Error("Queued slideshow image intent is missing Fal input");
  }
  const endpoint =
    typeof job.input.falEndpoint === "string"
      ? job.input.falEndpoint.trim()
      : "";
  const model = getModel(job.model);
  if (!model || model.type !== "image") {
    throw new Error("Queued slideshow image intent uses an unknown image model");
  }
  if (
    !endpoint ||
    (endpoint !== model.endpoint && endpoint !== `${model.endpoint}/edit`)
  ) {
    throw new Error("Queued slideshow image intent has an invalid Fal endpoint");
  }

  return {
    model: job.model,
    prompt: job.prompt,
    endpoint,
    falInput: job.input.falInput,
    estimatedCost: job.estimatedCost ?? 0,
    jobInput: job.input as SlideshowImageQueueRequest["jobInput"],
    tags: job.tags,
  };
}

const productionRecoveryDependencies: QueuedSlideshowImageRecoveryDependencies = {
  now: () => new Date(),
  listQueuedJobs: (limit, now) =>
    prisma.generationJob.findMany({
      where: {
        type: "image",
        status: "queued",
        falRequestId: null,
        tags: { has: "slideshow" },
        NOT: { tags: { has: "ugc-clone" } },
        // A deleted project cascades its slides but not the historical job
        // record. Never submit an image intent that no longer has a consumer.
        slideshowSlides: { some: {} },
        OR: [
          { lockOwner: null },
          { lockExpiresAt: null },
          { lockExpiresAt: { lt: now } },
        ],
      },
      orderBy: [{ createdAt: "asc" }],
      take: limit,
      select: {
        id: true,
        model: true,
        prompt: true,
        input: true,
        estimatedCost: true,
        tags: true,
        attempts: true,
      },
    }),
  // Maintenance polls processing jobs itself immediately afterward. Starting a
  // process-local interval here would race that durable polling pass.
  submit: (jobId, request) =>
    submitReservedSlideshowImage(jobId, request, {
      ...productionSlideshowImageSubmissionDependencies,
      startPoller: () => undefined,
    }),
  failQueuedJob: async (jobId, error, completedAt) => {
    const updated = await prisma.generationJob.updateMany({
      where: {
        id: jobId,
        status: "queued",
        falRequestId: null,
        tags: { has: "slideshow" },
        OR: [
          { lockOwner: null },
          { lockExpiresAt: null },
          { lockExpiresAt: { lt: completedAt } },
        ],
      },
      data: {
        status: "failed",
        error,
        completedAt,
        lockOwner: null,
        lockExpiresAt: null,
      },
    });
    return updated.count === 1;
  },
};

export async function recoverQueuedSlideshowImageJobs(
  options: {
    limit?: number;
    dependencies?: QueuedSlideshowImageRecoveryDependencies;
  } = {},
): Promise<QueuedSlideshowImageRecoveryResult> {
  const dependencies = options.dependencies ?? productionRecoveryDependencies;
  const now = dependencies.now();
  const jobs = await dependencies.listQueuedJobs(options.limit ?? 20, now);
  const result: QueuedSlideshowImageRecoveryResult = {
    candidates: jobs.length,
    claimed: 0,
    submitted: 0,
    persisted: 0,
    failed: 0,
    skipped: 0,
    errors: 0,
  };

  const outcomes = await Promise.allSettled(
    jobs.map(async (job) => {
      if (job.attempts > 0) {
        // The provider exposes no idempotency key. An expired lease after a
        // submission attempt may mean Fal accepted the request but the process
        // died before persisting its id. Replaying could double-charge, so fail
        // closed and let an explicit user regeneration create a new intent.
        const failed = await dependencies.failQueuedJob(
          job.id,
          "Image submission outcome is unknown; automatic replay was disabled to prevent a duplicate charge. Regenerate this slide manually.",
          dependencies.now(),
        );
        return failed ? ("queued-failed" as const) : ("unclaimed" as const);
      }

      let request: SlideshowImageQueueRequest;
      try {
        request = restorePersistedSlideshowImageQueueRequest(job);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Queued slideshow image intent is malformed";
        const failed = await dependencies.failQueuedJob(
          job.id,
          message,
          dependencies.now(),
        );
        return failed ? ("queued-failed" as const) : ("unclaimed" as const);
      }

      return dependencies.submit(job.id, request);
    }),
  );

  for (const outcome of outcomes) {
    if (outcome.status === "rejected") {
      result.errors += 1;
      console.error(
        "[Slideshow images] Failed to recover a queued image job:",
        outcome.reason,
      );
      continue;
    }
    if (outcome.value === "queued-failed") {
      result.claimed += 1;
      result.failed += 1;
      continue;
    }
    if (outcome.value === "unclaimed") {
      result.skipped += 1;
      continue;
    }
    if (outcome.value.claimed) result.claimed += 1;
    if (outcome.value.submitted) result.submitted += 1;
    if (outcome.value.persisted) result.persisted += 1;
    if (outcome.value.outcome === "failed") result.failed += 1;
    if (outcome.value.outcome === "unclaimed") result.skipped += 1;
    if (outcome.value.outcome === "error") result.errors += 1;
  }

  return result;
}
