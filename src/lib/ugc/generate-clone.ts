import * as fs from "fs/promises";
import { getDefaultModel } from "@/lib/ai/model-availability";
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
import { findCollectionAsset } from "@/lib/collection-assets-server";
import {
  InvalidCloneRequestError,
  parseCloneJobInput,
  PROCESS_LOCK_MS,
  UGC_CLONE_TAG,
  type CloneGenerationRequest,
  type CloneJobInput,
  type SourceVideoSnapshot,
} from "@/lib/ugc/clone-job-input";
import { buildFinalClonePrompt } from "@/lib/ugc/clone-prompt";
import {
  createSourceVideoSnapshot,
  isTrustedSourceVideoPath,
  sourceToSnapshot,
} from "@/lib/ugc/clone-source-snapshot";

export {
  InvalidCloneRequestError,
  type CloneGenerationRequest,
  type SourceVideoSnapshot,
};

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

export async function enqueueCloneJob(
  request: CloneGenerationRequest
): Promise<{ jobId: string; estimatedCost: number; modelId: string }> {
  const modelId = request.modelId ?? (await getDefaultModel("video"));
  const model = getModel(modelId);
  if (!model) {
    throw new Error("Motion control model not found in registry");
  }
  if (request.collectionAssetId && !modelId.startsWith("kling-3.0")) {
    throw new InvalidCloneRequestError(
      "Collection references require a Kling 3 model so the selected avatar identity stays bound"
    );
  }

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

  if (
    source &&
    !isTrustedSourceVideoPath(source, request.tiktokVideoPath, sourceVideoSnapshot)
  ) {
    throw new InvalidCloneRequestError(
      "TikTok video path does not match the selected source"
    );
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
  } else if (request.collectionAssetId) {
    const collectionAsset = await findCollectionAsset(request.collectionAssetId);
    if (!collectionAsset) {
      throw new InvalidCloneRequestError(
        `Collection image not found: ${request.collectionAssetId}`
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

  const hasRefImage =
    !!request.referenceImageFileId ||
    !!request.collectionAssetId ||
    !!request.savedReferenceId;
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
      if (!isTrustedSourceVideoPath(source, request.tiktokVideoPath, request.sourceVideoSnapshot)) {
        throw new InvalidCloneRequestError(
          "TikTok video path does not match the selected source"
        );
      }
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

    const rawVideoFullPath = await storage.ensureLocalFile(videoPath);
    console.log("[ugc-clone] Normalizing video for motion control (30fps CFR, scene trim)...");
    const videoFullPath = await normalizeVideoForMotionControl(rawVideoFullPath);
    console.log(`[ugc-clone] Normalized video → ${videoFullPath}`);

    const hasRefImage =
      !!request.referenceImageFileId ||
      !!request.collectionAssetId ||
      !!request.savedReferenceId;
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
      } else if (request.collectionAssetId) {
        const collectionAsset = await findCollectionAsset(request.collectionAssetId);
        if (!collectionAsset) {
          throw new InvalidCloneRequestError(
            `Collection image not found: ${request.collectionAssetId}`
          );
        }
        refLocalPath = collectionAsset.localPath;
      } else {
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
      const referenceFramePath = await extractReferenceFrame(videoFullPath);
      [sceneImageUrl, videoUrl] = await Promise.all([
        uploadToFalStorage(referenceFramePath),
        uploadToFalStorage(videoFullPath),
      ]);

      fs.unlink(referenceFramePath).catch((err) => {
        console.warn(`[ugc-clone] Failed to cleanup reference frame: ${referenceFramePath}`, err);
      });
    }

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
