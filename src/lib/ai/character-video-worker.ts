import { hostname } from "os";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/ai/models";
import { uploadToFalStorage } from "@/lib/ai/fal-client";
import { buildImageProviderRequest } from "@/lib/ai/generate-image";
import { createJob, failJob, getJob } from "@/lib/jobs/queue";
import { storage } from "@/lib/storage";
import { buildAvatarImageGenerationRequest } from "@/lib/ugc/generate-avatar-image";
import {
  buildIdentityElementForAvatar,
  resolveIdentityReferenceUrlsForAvatar,
} from "@/lib/ugc/avatar-identity-pack";
import { buildCharacterVideoProviderRequest } from "./character-video-payload";
import {
  CHARACTER_VIDEO_LOCK_MS,
  submitDurableCharacterIntent,
} from "./character-video-submit";

export const CHARACTER_VIDEO_TAG = "character-video";
const CHARACTER_VIDEO_ANCHOR_TAG = "character-video-anchor";
const POLL_INTERVAL_MS = 4_000;
const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;

export interface CharacterVideoJobInput extends Record<string, unknown> {
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

const globalForCharacterVideoWorker = globalThis as unknown as {
  __postforge_character_video_worker_interval?: ReturnType<typeof setInterval> | null;
  __postforge_character_video_worker_ticking?: boolean;
};

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
          lockExpiresAt: new Date(Date.now() + CHARACTER_VIDEO_LOCK_MS),
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
