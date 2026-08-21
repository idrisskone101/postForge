import { randomUUID } from "crypto";

import { submitToQueue } from "./fal-client";
import { prisma } from "@/lib/db";
import {
  submitDurableFalRequest,
  type DurableFalSubmitOutcome,
  type DurableFalSubmitResult,
} from "@/lib/jobs/durable-fal-submit";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import type { SlideshowImageQueueRequest } from "./slideshow-image-queue";

// Longer than the cron cadence and ordinary serverless request lifetime, so a
// slow in-flight Fal submission cannot be reclaimed by the next tick.
const SLIDESHOW_SUBMISSION_LEASE_MS = 10 * 60 * 1000;
const slideshowSubmissionWorkerId = `${process.pid}:${randomUUID()}`;

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

export const productionSlideshowImageSubmissionDependencies: SlideshowImageSubmissionDependencies = {
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
    productionSlideshowImageSubmissionDependencies,
): Promise<SlideshowImageSubmissionResult> {
  const leaseOwner = dependencies.createLeaseOwner();
  const claimedAt = dependencies.now();

  try {
    const result = await submitDurableFalRequest({
      claim: () =>
        dependencies.claimQueuedJob(
          jobId,
          leaseOwner,
          claimedAt,
          new Date(claimedAt.getTime() + SLIDESHOW_SUBMISSION_LEASE_MS),
        ),
      submit: () => dependencies.submitToQueue(request.endpoint, request.falInput),
      persistRequestId: (requestId) =>
        dependencies.markProcessing(
          jobId,
          leaseOwner,
          requestId,
          dependencies.now(),
        ),
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
    return slideshowSubmissionResult(result);
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
  result: DurableFalSubmitResult,
): SlideshowImageSubmissionResult {
  return {
    claimed: result.claimed,
    submitted: result.submitted,
    persisted: result.persisted,
    outcome: slideshowOutcome(result.outcome),
  };
}

function slideshowOutcome(
  outcome: DurableFalSubmitOutcome,
): NonNullable<SlideshowImageSubmissionResult["outcome"]> {
  switch (outcome) {
    case "unclaimed":
      return "unclaimed";
    case "submitted":
      return "submitted";
    case "failed":
      return "failed";
    case "error":
    case "submission-unknown":
      return "error";
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}
