import { hostname } from "os";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { submitToQueue } from "@/lib/ai/fal-client";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import { submitAcceptedFalRequest } from "@/lib/jobs/durable-fal-submit";

export const CHARACTER_VIDEO_LOCK_MS = 2 * 60 * 1000;
const submitWorkerId = `${hostname()}:${process.pid}:${randomUUID()}`;

type DurableSubmissionOutcome =
  | "submitted"
  | "unclaimed"
  | "submission-unknown";

export interface DurableCharacterSubmissionDependencies {
  createLeaseOwner: () => string;
  now: () => Date;
  claim: (
    jobId: string,
    leaseOwner: string,
    currentOwner: string | undefined,
    now: Date,
    leaseExpiresAt: Date,
    submittingStage: string
  ) => Promise<boolean>;
  readIntent: (
    jobId: string
  ) => Promise<{ endpoint: string; payload: Record<string, unknown> } | null>;
  submit: (
    endpoint: string,
    payload: Record<string, unknown>
  ) => Promise<{ request_id: string }>;
  markSubmitted: (
    jobId: string,
    leaseOwner: string,
    requestId: string,
    submittedStage: string
  ) => Promise<boolean>;
  markUnknown: (
    jobId: string,
    leaseOwner: string,
    message: string,
    completedAt: Date
  ) => Promise<boolean>;
  startPoller: () => void;
}

function readPersistedFalIntent(value: unknown): {
  endpoint: string;
  payload: Record<string, unknown>;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const endpoint =
    typeof input.falEndpoint === "string" ? input.falEndpoint.trim() : "";
  const payload = input.falInput;
  if (!endpoint || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  return { endpoint, payload: payload as Record<string, unknown> };
}

const productionDurableSubmissionDependencies: DurableCharacterSubmissionDependencies = {
  createLeaseOwner: () => `${submitWorkerId}:submit:${randomUUID()}`,
  now: () => new Date(),
  claim: async (
    jobId,
    leaseOwner,
    currentOwner,
    now,
    leaseExpiresAt,
    submittingStage
  ) => {
    const claimed = await prisma.generationJob.updateMany({
      where: {
        id: jobId,
        status: { in: ["queued", "processing"] },
        falRequestId: null,
        attempts: 0,
        OR: [
          { lockOwner: null },
          { lockExpiresAt: null },
          { lockExpiresAt: { lt: now } },
          ...(currentOwner ? [{ lockOwner: currentOwner }] : []),
        ],
      },
      data: {
        status: "processing",
        queueStage: submittingStage,
        lockOwner: leaseOwner,
        lockExpiresAt: leaseExpiresAt,
        attempts: { increment: 1 },
      },
    });
    return claimed.count === 1;
  },
  readIntent: async (jobId) => {
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { input: true },
    });
    return readPersistedFalIntent(job?.input);
  },
  submit: submitToQueue,
  markSubmitted: async (jobId, leaseOwner, requestId, submittedStage) => {
    const updated = await prisma.generationJob.updateMany({
      where: { id: jobId, falRequestId: null, lockOwner: leaseOwner },
      data: {
        status: "processing",
        queueStage: submittedStage,
        startedAt: new Date(),
        falRequestId: requestId,
        lockOwner: null,
        lockExpiresAt: null,
        nextAttemptAt: null,
      },
    });
    return updated.count === 1;
  },
  markUnknown: async (jobId, leaseOwner, message, completedAt) => {
    const updated = await prisma.generationJob.updateMany({
      where: { id: jobId, falRequestId: null, lockOwner: leaseOwner },
      data: {
        status: "failed",
        queueStage: "submission-unknown",
        error: message,
        completedAt,
        lockOwner: null,
        lockExpiresAt: null,
        nextAttemptAt: null,
      },
    });
    return updated.count === 1;
  },
  startPoller: ensurePollerRunning,
};

export async function submitDurableCharacterIntent(
  jobId: string,
  options: {
    submittingStage: string;
    submittedStage: string;
    currentOwner?: string;
    dependencies?: DurableCharacterSubmissionDependencies;
  }
): Promise<DurableSubmissionOutcome> {
  const dependencies =
    options.dependencies ?? productionDurableSubmissionDependencies;
  const leaseOwner = dependencies.createLeaseOwner();
  const now = dependencies.now();
  const claimed = await dependencies.claim(
    jobId,
    leaseOwner,
    options.currentOwner,
    now,
    new Date(now.getTime() + CHARACTER_VIDEO_LOCK_MS),
    options.submittingStage
  );
  if (!claimed) return "unclaimed";

  const intent = await dependencies.readIntent(jobId);
  if (!intent) {
    await dependencies.markUnknown(
      jobId,
      leaseOwner,
      "Generation submission intent is missing; the provider was not replayed.",
      dependencies.now()
    );
    return "submission-unknown";
  }

  const result = await submitAcceptedFalRequest({
    submit: () => dependencies.submit(intent.endpoint, intent.payload),
    persistRequestId: (requestId) =>
      dependencies.markSubmitted(
        jobId,
        leaseOwner,
        requestId,
        options.submittedStage
      ),
    onAmbiguous: async (error) => {
      const persistLost = error.message.includes("could not be persisted");
      await dependencies.markUnknown(
        jobId,
        leaseOwner,
        persistLost
          ? "Generation submission was accepted but its request id could not be persisted; automatic replay was disabled to prevent a duplicate charge."
          : "Generation submission outcome is unknown; automatic replay was disabled to prevent a duplicate charge. Retry manually only after checking provider activity.",
        dependencies.now()
      );
      return "submission-unknown";
    },
    onStarted: () => {
      dependencies.startPoller();
    },
  });
  switch (result.outcome) {
    case "submitted":
      return "submitted";
    case "unclaimed":
      return "unclaimed";
    case "submission-unknown":
    case "failed":
    case "error":
      return "submission-unknown";
    default: {
      const exhaustive: never = result.outcome;
      return exhaustive;
    }
  }
}
