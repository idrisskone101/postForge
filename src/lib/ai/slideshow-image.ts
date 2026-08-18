import { randomUUID } from "crypto";

import { submitToQueue } from "./fal-client";
import {
  calculateEstimatedCost,
  getModel,
  mapAspectRatioToFalFormat,
} from "./models";
import { prisma } from "@/lib/db";
import {
  submitDurableFalRequest,
  type DurableFalSubmitOutcome,
} from "@/lib/jobs/durable-fal-submit";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import type { GenerationJob } from "@/generated/prisma/client";

const SLIDESHOW_ASPECT_RATIOS = new Set(["9:16", "4:5", "1:1", "16:9"]);
// Longer than the cron cadence and ordinary serverless request lifetime, so a
// slow in-flight Fal submission cannot be reclaimed by the next tick.
const SLIDESHOW_SUBMISSION_LEASE_MS = 10 * 60 * 1000;
const slideshowSubmissionWorkerId = `${process.pid}:${randomUUID()}`;

// Legacy sync default; callers resolve the centralized default (when no model
// is provided) before building the request.
const DEFAULT_SLIDESHOW_IMAGE_MODEL = "nano-banana-2";

export type QueueSlideshowImageInput = {
  projectId: string;
  slideId: string;
  prompt: string;
  aspectRatio?: string;
  model?: string;
  referenceImageUrls?: string[];
};

export function buildSlideshowImagePrompt(prompt: string) {
  const subject = prompt.trim();
  if (!subject) throw new Error("An image prompt is required.");

  return [
    subject,
    "Create an original premium editorial photograph for a social-media slideshow.",
    "No text, captions, logos, app interfaces, watermarks, borders, or recognizable brand marks.",
    "Keep the main subject inside the center safe area so overlaid copy remains readable.",
  ].join(" ");
}

export function buildSlideshowImageQueueRequest(input: QueueSlideshowImageInput) {
  const projectId = input.projectId.trim();
  const slideId = input.slideId.trim();
  if (!projectId || !slideId) {
    throw new Error("A slideshow project and slide are required.");
  }

  const model = input.model?.trim() || DEFAULT_SLIDESHOW_IMAGE_MODEL;
  const modelDefinition = getModel(model);
  if (!modelDefinition || modelDefinition.type !== "image") {
    throw new Error(`Unknown slideshow image model: ${model}`);
  }

  const aspectRatio = SLIDESHOW_ASPECT_RATIOS.has(input.aspectRatio ?? "")
    ? input.aspectRatio
    : "9:16";
  const referenceImageUrls = (input.referenceImageUrls ?? [])
    .filter((url) => typeof url === "string" && /^https?:\/\//.test(url))
    .slice(0, modelDefinition.capabilities.maxReferenceImages ?? 0);
  const prompt = buildSlideshowImagePrompt(input.prompt);
  const estimatedCost = calculateEstimatedCost(model, { numImages: 1 });
  const endpoint = referenceImageUrls.length
    ? `${modelDefinition.endpoint}/edit`
    : modelDefinition.endpoint;
  const falInput: Record<string, unknown> = {
    prompt,
    num_images: 1,
    safety_tolerance: "6",
    ...(referenceImageUrls.length
      ? {
          image_urls: referenceImageUrls,
          aspect_ratio: aspectRatio,
          thinking_level: "high",
        }
      : {
          image_size: mapAspectRatioToFalFormat(aspectRatio ?? "9:16", model),
        }),
  };
  const jobInput = {
    kind: "slideshow-slide-image",
    projectId,
    slideId,
    prompt,
    aspectRatio,
    referenceImageUrls,
    falInput,
    falEndpoint: endpoint,
  };

  return {
    model,
    prompt,
    endpoint,
    falInput,
    estimatedCost,
    jobInput,
    tags: ["slideshow", `slideshow:${projectId}`, `slide:${slideId}`],
  };
}

export type SlideshowImageQueueRequest = ReturnType<
  typeof buildSlideshowImageQueueRequest
>;

export type SlideshowImageSubmissionResult = {
  submitted: boolean;
  /** Recovery metadata; optional to preserve the original caller contract. */
  claimed?: boolean;
  persisted?: boolean;
  outcome?: "submitted" | "unclaimed" | "failed" | "error";
};

export type SlideshowImageSubmissionDependencies = {
  createLeaseOwner: () => string;
  now: () => Date;
  claimQueuedJob: (
    jobId: string,
    leaseOwner: string,
    now: Date,
    leaseExpiresAt: Date,
  ) => Promise<boolean>;
  submitToQueue: (
    endpoint: string,
    input: Record<string, unknown>,
  ) => Promise<{ request_id: string }>;
  markProcessing: (
    jobId: string,
    leaseOwner: string,
    requestId: string,
    startedAt: Date,
  ) => Promise<boolean>;
  failClaimedJob: (
    jobId: string,
    leaseOwner: string,
    error: string,
    completedAt: Date,
  ) => Promise<boolean>;
  startPoller: () => void;
};

const productionSubmissionDependencies: SlideshowImageSubmissionDependencies = {
  createLeaseOwner: () => `${slideshowSubmissionWorkerId}:${randomUUID()}`,
  now: () => new Date(),
  claimQueuedJob: async (jobId, leaseOwner, now, leaseExpiresAt) => {
    const claimed = await prisma.generationJob.updateMany({
      where: {
        id: jobId,
        status: "queued",
        falRequestId: null,
        tags: { has: "slideshow" },
        OR: [
          { lockOwner: null },
          { lockExpiresAt: null },
          { lockExpiresAt: { lt: now } },
        ],
      },
      data: {
        lockOwner: leaseOwner,
        lockExpiresAt: leaseExpiresAt,
        attempts: { increment: 1 },
      },
    });
    return claimed.count === 1;
  },
  submitToQueue,
  markProcessing: async (jobId, leaseOwner, requestId, startedAt) => {
    const updated = await prisma.generationJob.updateMany({
      where: {
        id: jobId,
        status: "queued",
        falRequestId: null,
        lockOwner: leaseOwner,
      },
      data: {
        status: "processing",
        startedAt,
        falRequestId: requestId,
        lockOwner: null,
        lockExpiresAt: null,
      },
    });
    return updated.count === 1;
  },
  failClaimedJob: async (jobId, leaseOwner, error, completedAt) => {
    const updated = await prisma.generationJob.updateMany({
      where: {
        id: jobId,
        status: "queued",
        falRequestId: null,
        lockOwner: leaseOwner,
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
  startPoller: ensurePollerRunning,
};

export async function submitReservedSlideshowImage(
  jobId: string,
  request: SlideshowImageQueueRequest,
  dependencies: SlideshowImageSubmissionDependencies =
    productionSubmissionDependencies,
): Promise<SlideshowImageSubmissionResult> {
  const leaseOwner = dependencies.createLeaseOwner();
  const claimedAt = dependencies.now();
  let claimed = false;
  let submitted = false;
  let persisted = false;

  try {
    const outcome = await submitDurableFalRequest({
      claim: async () => {
        claimed = await dependencies.claimQueuedJob(
          jobId,
          leaseOwner,
          claimedAt,
          new Date(claimedAt.getTime() + SLIDESHOW_SUBMISSION_LEASE_MS),
        );
        return claimed;
      },
      submit: () => dependencies.submitToQueue(request.endpoint, request.falInput),
      persistRequestId: async (requestId) => {
        submitted = true;
        persisted = await dependencies.markProcessing(
          jobId,
          leaseOwner,
          requestId,
          dependencies.now(),
        );
        return persisted;
      },
      onRejectedBeforeAccept: async (error) => {
        const failed = await dependencies
          .failClaimedJob(jobId, leaseOwner, error.message, dependencies.now())
          .catch(() => false);
        return failed ? "failed" : "error";
      },
      onAmbiguous: async (error) => {
        console.error(
          `[Slideshow images] Fal accepted job ${jobId}, but its request id could not be persisted:`,
          error,
        );
        return "error";
      },
      onStarted: () => {
        dependencies.startPoller();
      },
    });
    return slideshowSubmissionResult(outcome, { claimed, submitted, persisted });
  } catch (error) {
    console.error(
      `[Slideshow images] Failed to claim queued job ${jobId}:`,
      error,
    );
    return {
      claimed: false,
      submitted: false,
      persisted: false,
      outcome: "error",
    };
  }
}

function slideshowSubmissionResult(
  outcome: DurableFalSubmitOutcome,
  state: { claimed: boolean; submitted: boolean; persisted: boolean },
): SlideshowImageSubmissionResult {
  switch (outcome) {
    case "unclaimed":
      return {
        claimed: false,
        submitted: false,
        persisted: false,
        outcome: "unclaimed",
      };
    case "submitted":
      return {
        claimed: true,
        submitted: true,
        persisted: true,
        outcome: "submitted",
      };
    case "failed":
      return {
        claimed: true,
        submitted: false,
        persisted: false,
        outcome: "failed",
      };
    case "error":
    case "submission-unknown":
      return {
        claimed: state.claimed,
        submitted: state.submitted,
        persisted: state.persisted,
        outcome: "error",
      };
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

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
      ...productionSubmissionDependencies,
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

export const slideshowImageAspectRatios = [...SLIDESHOW_ASPECT_RATIOS] as const;
