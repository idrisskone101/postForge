import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import { getModel, calculateEstimatedCost, BRIA_ERASER_COST_PER_SEC } from "@/lib/ai/models";
import { submitToQueue, uploadToFalStorage } from "@/lib/ai/fal-client";
import { createJob, failJob } from "@/lib/jobs/queue";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { extractReferenceFrame } from "@/lib/ugc/extract-frame";
import { eraseTextFromVideo } from "@/lib/ugc/erase-text";
import { normalizeVideoForMotionControl } from "@/lib/ugc/normalize-video";
import { buildIdentityElementForAvatar } from "@/lib/ugc/avatar-identity-pack";
import {
  clearCloneQueueLock,
  markCloneJobPreparing,
  markCloneJobSubmitted,
  setCloneQueueStage,
} from "@/lib/ugc/clone-queue-store";
import type { TikTokSource } from "@/generated/prisma/client";

// Default prompts for motion control.
// When a reference image is provided, it already contains the avatar in the scene,
// so we use a bare-minimum prompt — let the image speak for itself.
const DEFAULT_CLONE_PROMPT_WITH_REF =
  "Person performing the actions from the reference video, consistent appearance";
const DEFAULT_CLONE_PROMPT_V3 =
  "@Element1 in the scene, natural environment lighting, consistent background, seamless scene continuity";
const DEFAULT_CLONE_PROMPT_V2 =
  "Person in the scene, natural environment lighting, consistent background, seamless scene continuity";
const MOTION_CAMERA_LOCK_PROMPT =
  "Start from the supplied reference image and use the motion video for body movement and timing. Keep a natural front-facing phone-camera feel, but do not rigidly force the original TikTok crop, camera height, tilt, or distance if it makes the shoulders/body structure unstable. Avoid visible phones, tripod-like professional angles, and extra hands.";
const UGC_CLONE_TAG = "ugc-clone";
const PROCESS_LOCK_MS = 30 * 60 * 1000;

export interface CloneGenerationRequest {
  tiktokSourceId: string;
  tiktokVideoPath: string;
  avatarId: string;
  prompt?: string;
  keepOriginalSound?: boolean;
  modelId?: string;
  referenceImageFileId?: string;
  savedReferenceId?: string;
  durationSec?: number;
  removeTextOverlays?: boolean;
  sourceVideoSnapshot?: SourceVideoSnapshot;
}

export interface SourceVideoSnapshot {
  sourceId: string;
  label: string;
  originalUrl: string;
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
}

type CloneJobInput = CloneGenerationRequest & {
  modelId: string;
  sourceVideo?: SourceVideoSnapshot;
  sceneImageUrl?: string;
  videoUrl?: string;
  identityPackId?: string | null;
  identityElementImageUrls?: string[];
  usedKlingElementBinding?: boolean;
  textErasureCost?: number;
};

async function createSourceVideoSnapshot(
  source: {
    id: string;
    label: string;
    originalUrl: string;
    filename: string;
    durationSec: number;
    width: number;
    height: number;
  },
  localPath: string
): Promise<SourceVideoSnapshot> {
  const sourceFullPath = await storage.ensureLocalFile(localPath);
  const extension = path.extname(source.filename) || path.extname(localPath) || ".mp4";
  const snapshotFilename = `${randomUUID()}${extension}`;
  const snapshotLocalPath = await storage.saveFromFile(
    "ugc-clone-sources",
    snapshotFilename,
    sourceFullPath
  );

  return {
    sourceId: source.id,
    label: source.label,
    originalUrl: source.originalUrl,
    localPath: snapshotLocalPath,
    filename: snapshotFilename,
    durationSec: source.durationSec,
    width: source.width,
    height: source.height,
  };
}

export class InvalidCloneRequestError extends Error {}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseSourceVideoSnapshot(value: unknown): SourceVideoSnapshot | undefined {
  const input = asRecord(value);
  if (!input) return undefined;

  const sourceId = asString(input.sourceId);
  const label = asString(input.label);
  const originalUrl = asString(input.originalUrl);
  const localPath = asString(input.localPath);
  const filename = asString(input.filename);
  const durationSec = asNumber(input.durationSec);
  const width = asNumber(input.width);
  const height = asNumber(input.height);

  if (
    !sourceId ||
    !label ||
    !originalUrl ||
    !localPath ||
    !filename ||
    durationSec === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return undefined;
  }

  return {
    sourceId,
    label,
    originalUrl,
    localPath,
    filename,
    durationSec,
    width,
    height,
  };
}

function sourceToSnapshot(source: TikTokSource, localPath: string): SourceVideoSnapshot {
  return {
    sourceId: source.id,
    label: source.label,
    originalUrl: source.originalUrl,
    localPath,
    filename: source.filename,
    durationSec: source.durationSec,
    width: source.width,
    height: source.height,
  };
}

function buildFinalClonePrompt(params: {
  prompt?: string;
  hasRefImage: boolean;
  isV3: boolean;
}): string {
  const userPrompt = params.prompt?.trim();

  if (userPrompt) {
    const promptWithCameraLock = `${userPrompt} ${MOTION_CAMERA_LOCK_PROMPT}`;
    return params.isV3 && !promptWithCameraLock.includes("@Element1")
      ? `@Element1 ${promptWithCameraLock}`
      : params.isV3
        ? promptWithCameraLock
        : promptWithCameraLock.replace(/@Element1\s*/g, "");
  }

  if (params.hasRefImage) {
    return params.isV3
      ? `@Element1 ${DEFAULT_CLONE_PROMPT_WITH_REF}. ${MOTION_CAMERA_LOCK_PROMPT}`
      : `${DEFAULT_CLONE_PROMPT_WITH_REF}. ${MOTION_CAMERA_LOCK_PROMPT}`;
  }

  return params.isV3
    ? `${DEFAULT_CLONE_PROMPT_V3}. ${MOTION_CAMERA_LOCK_PROMPT}`
    : `${DEFAULT_CLONE_PROMPT_V2}. ${MOTION_CAMERA_LOCK_PROMPT}`;
}

function addMs(ms: number): Date {
  return new Date(Date.now() + ms);
}

async function updateCloneJobInput(
  jobId: string,
  input: CloneJobInput
): Promise<void> {
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      input: JSON.parse(JSON.stringify(input)),
    },
  });
}

function parseCloneJobInput(
  inputValue: unknown,
  fallbackModelId: string
): CloneJobInput | null {
  const input = asRecord(inputValue);
  if (!input) return null;

  const sourceVideo = parseSourceVideoSnapshot(input.sourceVideo);
  const sourceVideoSnapshot =
    parseSourceVideoSnapshot(input.sourceVideoSnapshot) ?? sourceVideo;
  const tiktokSourceId = asString(input.tiktokSourceId) ?? sourceVideoSnapshot?.sourceId;
  const tiktokVideoPath = asString(input.tiktokVideoPath) ?? sourceVideoSnapshot?.localPath;
  const avatarId = asString(input.avatarId);

  if (!tiktokSourceId || !tiktokVideoPath || !avatarId) {
    return null;
  }

  return {
    tiktokSourceId,
    tiktokVideoPath,
    avatarId,
    prompt: asString(input.prompt),
    keepOriginalSound: asBoolean(input.keepOriginalSound),
    modelId: asString(input.modelId) ?? fallbackModelId,
    referenceImageFileId: asString(input.referenceImageFileId),
    savedReferenceId: asString(input.savedReferenceId),
    durationSec: asNumber(input.durationSec),
    removeTextOverlays: input.removeTextOverlays === true,
    sourceVideoSnapshot,
    sourceVideo,
    sceneImageUrl: asString(input.sceneImageUrl),
    videoUrl: asString(input.videoUrl),
    identityPackId: asString(input.identityPackId) ?? null,
    identityElementImageUrls: Array.isArray(input.identityElementImageUrls)
      ? input.identityElementImageUrls.filter((url): url is string => typeof url === "string")
      : undefined,
    usedKlingElementBinding: input.usedKlingElementBinding === true,
    textErasureCost: asNumber(input.textErasureCost),
  };
}

export async function enqueueCloneJob(
  request: CloneGenerationRequest
): Promise<{ jobId: string; estimatedCost: number; modelId: string }> {
  const modelId = request.modelId ?? "kling-3.0-motion";
  const model = getModel(modelId);
  if (!model) {
    throw new Error("Motion control model not found in registry");
  }

  // Look up avatar
  const avatar = await prisma.avatar.findUnique({
    where: { id: request.avatarId },
  });
  if (!avatar) {
    throw new Error(`Avatar not found: ${request.avatarId}`);
  }

  const source = await prisma.tikTokSource.findUnique({
    where: { id: request.tiktokSourceId },
  });
  const sourceVideoSnapshot = request.sourceVideoSnapshot;
  if (!source && !sourceVideoSnapshot) {
    throw new Error(`TikTok source not found: ${request.tiktokSourceId}`);
  }

  if (request.savedReferenceId) {
    const savedReference = await prisma.ugcReferenceImage.findUnique({
      where: { id: request.savedReferenceId },
    });

    if (!savedReference) {
      throw new InvalidCloneRequestError(
        `Saved reference image not found: ${request.savedReferenceId}`
      );
    }

    if (savedReference.avatarId !== request.avatarId) {
      throw new InvalidCloneRequestError(
        "Saved reference image does not belong to the selected avatar"
      );
    }
  } else if (request.referenceImageFileId) {
    const refFile = await prisma.generatedFile.findUnique({
      where: { id: request.referenceImageFileId },
    });

    if (!refFile) {
      throw new InvalidCloneRequestError(
        `Reference image file not found: ${request.referenceImageFileId}`
      );
    }
  }

  const hasRefImage = !!request.referenceImageFileId || !!request.savedReferenceId;
  const isV3 = modelId.startsWith("kling-3.0");
  const rawDuration = request.durationSec ?? model.defaults.duration ?? 5;
  const minDuration = model.limits.minDuration ?? 1;
  const duration = Math.max(minDuration, Math.round(rawDuration));
  const textErasureEstimate = request.removeTextOverlays
    ? BRIA_ERASER_COST_PER_SEC * duration
    : 0;
  const estimatedCost =
    calculateEstimatedCost(modelId, { durationSec: duration }) + textErasureEstimate;
  const finalPrompt = buildFinalClonePrompt({
    prompt: request.prompt,
    hasRefImage,
    isV3,
  });

  const sourceVideo = source
    ? sourceToSnapshot(source, request.tiktokVideoPath)
    : sourceVideoSnapshot;

  const input: CloneJobInput = {
    ...request,
    modelId,
    sourceVideo,
  };

  const job = await createJob({
    type: "video",
    model: modelId,
    prompt: finalPrompt,
    input: input as unknown as Record<string, unknown>,
    estimatedCost,
    tags: [UGC_CLONE_TAG],
  });

  await setCloneQueueStage(job.id, "queued");

  return { jobId: job.id, estimatedCost, modelId };
}

export async function generateClone(
  request: CloneGenerationRequest
): Promise<{ jobId: string; estimatedCost: number; modelId: string }> {
  return enqueueCloneJob(request);
}

export async function processCloneJob(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
  });

  if (!job || !job.tags.includes(UGC_CLONE_TAG)) {
    return;
  }

  const request = parseCloneJobInput(job.input, job.model);
  if (!request) {
    await failJob(job.id, "UGC clone job is missing required input");
    return;
  }

  const modelId = request.modelId ?? job.model;
  const model = getModel(modelId);
  if (!model) {
    await failJob(job.id, "Motion control model not found in registry");
    return;
  }

  await markCloneJobPreparing(job.id, addMs(PROCESS_LOCK_MS));

  try {
    let sourceVideo: SourceVideoSnapshot;
    const source = await prisma.tikTokSource.findUnique({
      where: { id: request.tiktokSourceId },
    });
    if (source) {
      sourceVideo = await createSourceVideoSnapshot(source, request.tiktokVideoPath);
    } else if (request.sourceVideoSnapshot) {
      sourceVideo = await createSourceVideoSnapshot(
        {
          id: request.sourceVideoSnapshot.sourceId,
          label: request.sourceVideoSnapshot.label,
          originalUrl: request.sourceVideoSnapshot.originalUrl,
          filename: request.sourceVideoSnapshot.filename,
          durationSec: request.sourceVideoSnapshot.durationSec,
          width: request.sourceVideoSnapshot.width,
          height: request.sourceVideoSnapshot.height,
        },
        request.sourceVideoSnapshot.localPath
      );
    } else {
      throw new Error(`TikTok source not found: ${request.tiktokSourceId}`);
    }

    let persistedInput: CloneJobInput = {
      ...request,
      modelId,
      sourceVideo,
    };
    await updateCloneJobInput(job.id, persistedInput);

    // Resolve full paths
    // Optional: strip text overlays from the reference video before motion control.
    // This runs Bria Video Eraser on fal.ai and saves a cleaned copy locally.
    let videoPath = sourceVideo.localPath;
    let textErasureCost = 0;
    if (request.removeTextOverlays) {
      const rawDurationForErase = request.durationSec ?? 5;
      console.log(`[ugc-clone] Erasing text overlays from video (${rawDurationForErase}s)...`);
      const eraseResult = await eraseTextFromVideo(videoPath, rawDurationForErase);
      videoPath = eraseResult.cleanedPath;
      textErasureCost = eraseResult.cost;
      console.log(`[ugc-clone] Text erasure complete → ${videoPath} (cost: $${textErasureCost.toFixed(3)})`);
      persistedInput = { ...persistedInput, textErasureCost };
      await updateCloneJobInput(job.id, persistedInput);
    }

    // Normalize video for optimal motion control: constant 30fps CFR,
    // trim to first scene (removes app screenshots / product cuts at end).
    const rawVideoFullPath = await storage.ensureLocalFile(videoPath);
    console.log("[ugc-clone] Normalizing video for motion control (30fps CFR, scene trim)...");
    const videoFullPath = await normalizeVideoForMotionControl(rawVideoFullPath);
    console.log(`[ugc-clone] Normalized video → ${videoFullPath}`);

    const hasRefImage = !!request.referenceImageFileId || !!request.savedReferenceId;
    let sceneImageUrl: string;
    let videoUrl: string;
    let identityPackId: string | null = null;
    let identityElementImageUrls: string[] = [];
    let identityElement: { frontal_image_url: string; reference_image_urls: string[] } | null = null;
    const isV3 = modelId.startsWith("kling-3.0");

    if (isV3) {
      const identityElementResult = await buildIdentityElementForAvatar(request.avatarId);
      identityPackId = identityElementResult.identityPackId;
      identityElementImageUrls = identityElementResult.identityElementImageUrls;
      identityElement = identityElementResult.element;
    }

    if (hasRefImage) {
      let refLocalPath: string;

      if (request.savedReferenceId) {
        const savedReference = await prisma.ugcReferenceImage.findUnique({
          where: { id: request.savedReferenceId },
        });

        if (!savedReference) {
          throw new InvalidCloneRequestError(
            `Saved reference image not found: ${request.savedReferenceId}`
          );
        }

        if (savedReference.avatarId !== request.avatarId) {
          throw new InvalidCloneRequestError(
            "Saved reference image does not belong to the selected avatar"
          );
        }

        refLocalPath = savedReference.localPath;
      } else {
        // Reference image already has the avatar composited into the scene.
        // We only need the reference image + the TikTok video — no separate avatar upload.
        const refFile = await prisma.generatedFile.findUnique({
          where: { id: request.referenceImageFileId },
        });
        if (!refFile) {
          throw new InvalidCloneRequestError(
            `Reference image file not found: ${request.referenceImageFileId}`
          );
        }

        refLocalPath = refFile.localPath;
      }

      const refFullPath = await storage.ensureLocalFile(refLocalPath);
      [sceneImageUrl, videoUrl] = await Promise.all([
        uploadToFalStorage(refFullPath),
        uploadToFalStorage(videoFullPath),
      ]);
    } else {
      // No reference image — fall back to extracting a frame + sending avatar separately
      const referenceFramePath = await extractReferenceFrame(videoFullPath);
      [sceneImageUrl, videoUrl] = await Promise.all([
        uploadToFalStorage(referenceFramePath),
        uploadToFalStorage(videoFullPath),
      ]);

      // Clean up temp reference frame
      fs.unlink(referenceFramePath).catch((err) => {
        console.warn(`[ugc-clone] Failed to cleanup reference frame: ${referenceFramePath}`, err);
      });
    }

    // Clean up temp normalized video (already uploaded to fal storage)
    if (videoFullPath !== rawVideoFullPath) {
      fs.unlink(videoFullPath).catch((err) => {
        console.warn(`[ugc-clone] Failed to cleanup normalized video: ${videoFullPath}`, err);
      });
    }

    persistedInput = {
      ...persistedInput,
      sourceVideo,
      sceneImageUrl,
      videoUrl,
      identityPackId,
      identityElementImageUrls,
      usedKlingElementBinding: isV3 && !!identityElement,
      textErasureCost,
    };
    await updateCloneJobInput(job.id, persistedInput);

    // Build fal input for motion-control endpoint.
    // NOTE: The motion control endpoint only accepts: image_url, video_url,
    // character_orientation, prompt, keep_original_sound, elements.
    // Parameters like cfg_scale, duration, aspect_ratio, negative_prompt
    // are silently ignored — output duration/aspect come from the reference video.
    const falInput: Record<string, unknown> = {
      image_url: sceneImageUrl,
      video_url: videoUrl,
      character_orientation: "video",
      prompt: job.prompt,
    };

    if (isV3 && identityElement) {
      falInput.elements = [identityElement];
    }

    if (request.keepOriginalSound !== undefined) {
      falInput.keep_original_sound = request.keepOriginalSound;
    }

    // Submit to queue
    const queueResult = await submitToQueue(model.endpoint, falInput);
    const requestId = queueResult.request_id;

    await markCloneJobSubmitted(job.id, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to submit job";
    await failJob(job.id, msg);
    await clearCloneQueueLock(job.id, "failed");
    throw err;
  }
}
