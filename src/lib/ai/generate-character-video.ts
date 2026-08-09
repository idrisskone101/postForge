import { hostname } from "os";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { calculateEstimatedCost, getModel } from "@/lib/ai/models";
import { getDefaultEditCapableImageModel } from "@/lib/ai/model-availability";
import { submitToQueue, uploadToFalStorage } from "@/lib/ai/fal-client";
import { buildImageProviderRequest } from "@/lib/ai/generate-image";
import { createJob, failJob, getJob } from "@/lib/jobs/queue";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import { storage } from "@/lib/storage";
import { buildAvatarImageGenerationRequest } from "@/lib/ugc/generate-avatar-image";
import {
  buildIdentityElementForAvatar,
  resolveIdentityReferenceUrlsForAvatar,
} from "@/lib/ugc/avatar-identity-pack";
import type { ModelCapabilities } from "@/lib/ai/types";

const CHARACTER_VIDEO_TAG = "character-video";
const CHARACTER_VIDEO_ANCHOR_TAG = "character-video-anchor";
const POLL_INTERVAL_MS = 4_000;
const LOCK_MS = 2 * 60 * 1000;
const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;

export interface CharacterVideoRequest {
  avatarId: string;
  prompt: string;
  model: string;
  duration?: number;
  aspectRatio?: string;
  enableAudio?: boolean;
  negativePrompt?: string;
  anchorJobId?: string;
}

interface CharacterVideoJobInput extends Record<string, unknown> {
  avatarId: string;
  prompt: string;
  model: string;
  duration: number;
  aspectRatio: string;
  enableAudio: boolean;
  negativePrompt?: string;
  anchorJobId?: string;
  falEndpoint?: string;
  falInput?: Record<string, unknown>;
}

export interface CharacterVideoPayloadInput {
  strategy: NonNullable<ModelCapabilities["characterReference"]>;
  prompt: string;
  anchorUrl: string;
  identityUrls: string[];
  identityElement?: {
    frontal_image_url: string;
    reference_image_urls: string[];
  };
  duration: number;
  aspectRatio: string;
  enableAudio: boolean;
  negativePrompt?: string;
}

const globalForCharacterVideoWorker = globalThis as unknown as {
  __postforge_character_video_worker_interval?: ReturnType<typeof setInterval> | null;
  __postforge_character_video_worker_ticking?: boolean;
};

function providerEndpoint(
  strategy: NonNullable<ModelCapabilities["characterReference"]>
): string {
  if (strategy === "kling-element") {
    return "fal-ai/kling-video/v3/standard/image-to-video";
  }
  if (strategy === "seedance-images") {
    return "bytedance/seedance-2.0/reference-to-video";
  }
  return "google/gemini-omni-flash/reference-to-video";
}

function characterContinuityInstruction() {
  return [
    "Keep the character's face, facial structure, age, skin tone, hair color, hair texture, and body proportions consistent in every frame.",
    "Preserve identity through head turns, expression changes, camera movement, and scene cuts.",
    "Avoid face drift, identity changes, morphing, duplicate people, and sudden wardrobe changes.",
  ].join(" ");
}

export function buildCharacterVideoProviderRequest(
  input: CharacterVideoPayloadInput
): { endpoint: string; payload: Record<string, unknown> } {
  const continuity = characterContinuityInstruction();

  if (input.strategy === "kling-element") {
    if (!input.identityElement) {
      throw new Error("Kling character video requires an identity element");
    }
    return {
      endpoint: providerEndpoint(input.strategy),
      payload: {
        prompt: `@Element1 is the character in the opening frame. ${continuity} Motion and scene direction: ${input.prompt}`,
        start_image_url: input.anchorUrl,
        duration: String(input.duration),
        generate_audio: input.enableAudio,
        elements: [input.identityElement],
        ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
      },
    };
  }

  const urls = [input.anchorUrl, ...input.identityUrls];
  if (input.strategy === "seedance-images") {
    const identityLabels = input.identityUrls
      .map((_, index) => `@Image${index + 2}`)
      .join(", ");
    return {
      endpoint: providerEndpoint(input.strategy),
      payload: {
        prompt: `@Image1 is the opening composition. ${identityLabels} show the same character from multiple angles. ${continuity} Motion and scene direction: ${input.prompt}`,
        image_urls: urls,
        resolution: "720p",
        duration: String(input.duration),
        aspect_ratio: input.aspectRatio,
        generate_audio: input.enableAudio,
      },
    };
  }

  const identityLabels = input.identityUrls
    .map((_, index) => `<IMAGE_REF_${index + 1}>`)
    .join(", ");
  return {
    endpoint: providerEndpoint(input.strategy),
    payload: {
      prompt: `<IMAGE_REF_0> is the opening composition. ${identityLabels} show the same character from multiple angles. ${continuity} Motion and scene direction: ${input.prompt}`,
      image_urls: urls,
      duration: input.duration,
      aspect_ratio: input.aspectRatio,
    },
  };
}

export async function generateCharacterVideo(
  request: CharacterVideoRequest
): Promise<{ jobId: string; estimatedCost: number; model: string }> {
  const model = getModel(request.model);
  if (!model || model.type !== "video" || !model.capabilities.characterReference) {
    throw new Error(`Model ${request.model} does not support character video`);
  }

  const avatar = await prisma.avatar.findUnique({
    where: { id: request.avatarId },
    select: { id: true },
  });
  if (!avatar) throw new Error(`Avatar not found: ${request.avatarId}`);

  const duration = request.duration ?? model.defaults.duration ?? 5;
  const aspectRatio = request.aspectRatio ?? model.defaults.aspectRatio;
  const imageModel = await getDefaultEditCapableImageModel();
  const estimatedCost =
    (request.anchorJobId
      ? 0
      : calculateEstimatedCost(imageModel, { numImages: 1 })) +
    calculateEstimatedCost(request.model, {
      durationSec: duration,
      enableAudio: request.enableAudio,
    });

  const input: CharacterVideoJobInput = {
    avatarId: request.avatarId,
    prompt: request.prompt,
    model: request.model,
    duration,
    aspectRatio,
    enableAudio: request.enableAudio === true,
    ...(request.negativePrompt ? { negativePrompt: request.negativePrompt } : {}),
    ...(request.anchorJobId ? { anchorJobId: request.anchorJobId } : {}),
  };

  const job = await createJob({
    type: "video",
    model: request.model,
    prompt: request.prompt,
    input,
    estimatedCost,
    tags: [CHARACTER_VIDEO_TAG],
  });
  await prisma.generationJob.update({
    where: { id: job.id },
    data: { queueStage: "queued" },
  });
  ensureCharacterVideoWorkerRunning();

  return { jobId: job.id, estimatedCost, model: request.model };
}

export function ensureCharacterVideoWorkerRunning(): void {
  if (!globalForCharacterVideoWorker.__postforge_character_video_worker_interval) {
    globalForCharacterVideoWorker.__postforge_character_video_worker_interval = setInterval(() => {
      void runCharacterVideoWorkerTick();
    }, POLL_INTERVAL_MS);
  }
  void runCharacterVideoWorkerTick();
}

function stopCharacterVideoWorker(): void {
  if (globalForCharacterVideoWorker.__postforge_character_video_worker_interval) {
    clearInterval(globalForCharacterVideoWorker.__postforge_character_video_worker_interval);
    globalForCharacterVideoWorker.__postforge_character_video_worker_interval = null;
  }
}

function parseJobInput(value: unknown): CharacterVideoJobInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Character video job is missing its saved input");
  }
  const input = value as Partial<CharacterVideoJobInput>;
  if (
    typeof input.avatarId !== "string" ||
    typeof input.prompt !== "string" ||
    typeof input.model !== "string" ||
    typeof input.duration !== "number" ||
    typeof input.aspectRatio !== "string"
  ) {
    throw new Error("Character video job has invalid saved input");
  }
  return {
    ...input,
    avatarId: input.avatarId,
    prompt: input.prompt,
    model: input.model,
    duration: input.duration,
    aspectRatio: input.aspectRatio,
    enableAudio: input.enableAudio === true,
  } as CharacterVideoJobInput;
}

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
  createLeaseOwner: () => `${workerId}:submit:${randomUUID()}`,
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
    new Date(now.getTime() + LOCK_MS),
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

  try {
    const queued = await dependencies.submit(intent.endpoint, intent.payload);
    const requestId = queued.request_id?.trim();
    if (!requestId) throw new Error("The generation provider did not return a request id");
    const persisted = await dependencies.markSubmitted(
      jobId,
      leaseOwner,
      requestId,
      options.submittedStage
    );
    if (!persisted) {
      await dependencies.markUnknown(
        jobId,
        leaseOwner,
        "Generation submission was accepted but its request id could not be persisted; automatic replay was disabled to prevent a duplicate charge.",
        dependencies.now()
      );
      return "submission-unknown";
    }
    dependencies.startPoller();
    return "submitted";
  } catch {
    await dependencies.markUnknown(
      jobId,
      leaseOwner,
      "Generation submission outcome is unknown; automatic replay was disabled to prevent a duplicate charge. Retry manually only after checking provider activity.",
      dependencies.now()
    );
    return "submission-unknown";
  }
}

async function failExpiredAmbiguousSubmission(jobId: string): Promise<void> {
  await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      falRequestId: null,
      attempts: { gt: 0 },
      lockOwner: workerId,
    },
    data: {
      status: "failed",
      queueStage: "submission-unknown",
      error:
        "Generation submission outcome is unknown; automatic replay was disabled to prevent a duplicate charge. Retry manually only after checking provider activity.",
      completedAt: new Date(),
      lockOwner: null,
      lockExpiresAt: null,
      nextAttemptAt: null,
    },
  });
}

async function releaseJob(jobId: string, delayMs = POLL_INTERVAL_MS): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      lockOwner: null,
      lockExpiresAt: null,
      nextAttemptAt: new Date(Date.now() + delayMs),
    },
  });
}

async function processCharacterVideoJob(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job || job.falRequestId) return;

  const input = parseJobInput(job.input);
  const model = getModel(input.model);
  const strategy = model?.capabilities.characterReference;
  if (!model || model.type !== "video" || !strategy) {
    throw new Error(`Model ${input.model} does not support character video`);
  }

  if (input.falEndpoint && input.falInput) {
    if (job.attempts > 0) {
      await failExpiredAmbiguousSubmission(jobId);
      return;
    }
    const outcome = await submitDurableCharacterIntent(jobId, {
      submittingStage: "submitting-video",
      submittedStage: "submitted",
      currentOwner: workerId,
    });
    if (outcome === "unclaimed") {
      throw new Error("Character video submission could not be reserved");
    }
    return;
  }

  let anchorJobId = input.anchorJobId;
  if (!anchorJobId) {
    const anchorRequest = await buildAvatarImageGenerationRequest({
      avatarId: input.avatarId,
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
      numImages: 1,
      negativePrompt: input.negativePrompt,
    });
    const anchorProviderRequest = buildImageProviderRequest(anchorRequest.request);
    const anchor = await createJob({
      type: "image",
      model: anchorRequest.model,
      prompt: anchorRequest.request.prompt,
      input: {
        ...anchorRequest.jobInput,
        falEndpoint: anchorProviderRequest.endpoint,
        falInput: anchorProviderRequest.payload,
      },
      estimatedCost: anchorRequest.estimatedCost,
      tags: ["generate-avatar", CHARACTER_VIDEO_ANCHOR_TAG],
    });
    anchorJobId = anchor.id;
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "processing",
        queueStage: "creating-anchor",
        startedAt: job.startedAt ?? new Date(),
        input: JSON.parse(JSON.stringify({ ...input, anchorJobId })),
      },
    });
    await submitDurableCharacterIntent(anchorJobId, {
      submittingStage: "submitting-anchor",
      submittedStage: "submitted",
    });
    await releaseJob(jobId);
    return;
  }

  const anchorJob = await getJob(anchorJobId);
  if (!anchorJob) throw new Error("Character video opening-frame job was not found");
  if (anchorJob.status === "failed") {
    throw new Error(anchorJob.error || "Character video opening frame failed");
  }
  if (!anchorJob.falRequestId && anchorJob.status !== "completed") {
    const anchorLockActive =
      anchorJob.lockExpiresAt && anchorJob.lockExpiresAt.getTime() > Date.now();
    if (anchorJob.attempts > 0) {
      if (!anchorLockActive) {
        await prisma.generationJob.updateMany({
          where: {
            id: anchorJob.id,
            falRequestId: null,
            attempts: { gt: 0 },
            OR: [{ lockOwner: null }, { lockExpiresAt: { lt: new Date() } }],
          },
          data: {
            status: "failed",
            queueStage: "submission-unknown",
            error:
              "Opening-frame submission outcome is unknown; automatic replay was disabled to prevent a duplicate charge.",
            completedAt: new Date(),
            lockOwner: null,
            lockExpiresAt: null,
          },
        });
      }
      await releaseJob(jobId);
      return;
    }
    await submitDurableCharacterIntent(anchorJob.id, {
      submittingStage: "submitting-anchor",
      submittedStage: "submitted",
    });
    await releaseJob(jobId);
    return;
  }
  if (anchorJob.status !== "completed") {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { queueStage: "creating-anchor" },
    });
    await releaseJob(jobId);
    return;
  }

  const anchorFile = anchorJob.outputs.find((output) => output.type === "image");
  if (!anchorFile) throw new Error("Character video opening frame has no image output");
  const anchorUrl = await uploadToFalStorage(
    await storage.ensureLocalFile(anchorFile.localPath)
  );

  let identityUrls: string[] = [];
  let identityPackId: string | null = null;
  let identityElement:
    | { frontal_image_url: string; reference_image_urls: string[] }
    | undefined;

  if (strategy === "kling-element") {
    const identity = await buildIdentityElementForAvatar(input.avatarId);
    identityPackId = identity.identityPackId;
    identityUrls = identity.identityElementImageUrls;
    identityElement = identity.element;
  } else {
    const identity = await resolveIdentityReferenceUrlsForAvatar(input.avatarId);
    identityPackId = identity.identityPackId;
    identityUrls = identity.identityReferenceUrls;
  }

  const request = buildCharacterVideoProviderRequest({
    strategy,
    prompt: input.prompt,
    anchorUrl,
    identityUrls,
    identityElement,
    duration: input.duration,
    aspectRatio: input.aspectRatio,
    enableAudio: input.enableAudio,
    negativePrompt: input.negativePrompt,
  });
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      status: "queued",
      queueStage: "video-ready",
      startedAt: job.startedAt ?? new Date(),
      input: JSON.parse(
        JSON.stringify({
          ...input,
          anchorJobId,
          anchorFileId: anchorFile.id,
          identityPackId,
          identityReferenceCount: identityUrls.length,
          characterReferenceStrategy: strategy,
          falEndpoint: request.endpoint,
          falInput: request.payload,
          enable_audio: input.enableAudio,
        })
      ),
    },
  });
  const outcome = await submitDurableCharacterIntent(jobId, {
    submittingStage: "submitting-video",
    submittedStage: "submitted",
    currentOwner: workerId,
  });
  if (outcome === "unclaimed") {
    throw new Error("Character video submission could not be reserved");
  }
}

export async function runCharacterVideoWorkerTick(): Promise<void> {
  if (globalForCharacterVideoWorker.__postforge_character_video_worker_ticking) return;
  globalForCharacterVideoWorker.__postforge_character_video_worker_ticking = true;

  try {
    const now = new Date();
    const candidates = await prisma.generationJob.findMany({
      where: {
        type: "video",
        tags: { has: CHARACTER_VIDEO_TAG },
        status: { in: ["queued", "processing"] },
        falRequestId: null,
        AND: [
          { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
          { OR: [{ lockOwner: null }, { lockExpiresAt: { lt: now } }] },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 2,
      select: { id: true },
    });

    for (const candidate of candidates) {
      const claimed = await prisma.generationJob.updateMany({
        where: {
          id: candidate.id,
          falRequestId: null,
          OR: [{ lockOwner: null }, { lockExpiresAt: { lt: now } }],
        },
        data: {
          status: "processing",
          lockOwner: workerId,
          lockExpiresAt: new Date(Date.now() + LOCK_MS),
          error: null,
        },
      });
      if (claimed.count === 0) continue;

      try {
        await processCharacterVideoJob(candidate.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Character video failed";
        await failJob(candidate.id, message);
        await prisma.generationJob.update({
          where: { id: candidate.id },
          data: {
            queueStage: "failed",
            lockOwner: null,
            lockExpiresAt: null,
          },
        });
      }
    }

    const remaining = await prisma.generationJob.count({
      where: {
        type: "video",
        tags: { has: CHARACTER_VIDEO_TAG },
        status: { in: ["queued", "processing"] },
        falRequestId: null,
      },
    });
    if (remaining === 0) stopCharacterVideoWorker();
  } finally {
    globalForCharacterVideoWorker.__postforge_character_video_worker_ticking = false;
  }
}
