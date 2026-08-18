import { getJob } from "@/lib/jobs/queue";
import { generateImage } from "@/lib/ai/generate-image";
import { generateVideo, generateVideoSwap } from "@/lib/ai/generate-video";
import { getModel } from "@/lib/ai/models";
import type {
  ImageGenerationRequest,
  VideoGenerationRequest,
} from "@/lib/ai/types";
import {
  generateClone,
  InvalidCloneRequestError,
} from "@/lib/ugc/generate-clone";
import { ensureCloneWorkerRunning } from "@/lib/ugc/clone-worker";
import {
  CollectionAssetRequestError,
  resolveCollectionAssetLocalPath,
} from "@/lib/collection-assets-server";
import {
  resolveSwapReferenceUrl,
  resolveSwapSourceVideoUrl,
} from "@/lib/swap-assets-server";
import {
  asRetryBoolean,
  asRetryNumber,
  asRetryString,
  buildCloneRetryRequest,
  buildSwapRetryRequest,
  parseRetryMultiShot,
} from "@/lib/jobs/retry-inputs";
import {
  resolveImageRetryReferences,
  resolveVideoRetryReference,
} from "@/lib/jobs/retry-reference-resolution";
import { generateCharacterVideo } from "@/lib/ai/generate-character-video";

export type RetryGenerationResult = {
  status: number;
  body: Record<string, unknown>;
};

function retryError(status: number, error: string): RetryGenerationResult {
  return { status, body: { error } };
}

function retryQueued(body: Record<string, unknown>): RetryGenerationResult {
  return { status: 202, body };
}

export async function retryGenerationJob(id: string): Promise<RetryGenerationResult> {
  try {
    const originalJob = await getJob(id);

    if (!originalJob) {
      return retryError(404, "Job not found");
    }

    const input = originalJob.input as Record<string, unknown>;
    const isUgcClone = originalJob.tags.includes("ugc-clone");
    const isVideoSwap = originalJob.tags.includes("video-swap");
    const isCharacterVideo = originalJob.tags.includes("character-video");
    const isTerminal =
      originalJob.status === "completed" || originalJob.status === "failed";

    if (isVideoSwap) {
      if (!isTerminal) {
        return retryError(
          400,
          `Can only retry completed or failed subject swap jobs. Current status: ${originalJob.status}`,
        );
      }

      const swapRequest = buildSwapRetryRequest(input, originalJob.model);
      if (!swapRequest) {
        return retryError(
          400,
          "This subject swap job is missing saved inputs, so it cannot be retried.",
        );
      }

      const resolvedVideo = await resolveSwapSourceVideoUrl(swapRequest.videoUrl);
      if (!resolvedVideo) {
        return retryError(404, "The swap source video could not be found for retry");
      }
      const referenceUrl = swapRequest.referenceImageUrl
        ? ((await resolveSwapReferenceUrl(swapRequest.referenceImageUrl)) ?? undefined)
        : undefined;
      if (
        swapRequest.model === "pixverse-swap" &&
        !referenceUrl
      ) {
        return retryError(404, "The swap reference image could not be found for retry");
      }

      const newJobId = await generateVideoSwap({
        ...swapRequest,
        videoUrl: resolvedVideo.url,
        referenceImageUrl: referenceUrl,
      });

      return retryQueued({
        id: newJobId,
        originalJobId: id,
        status: "queued",
        type: "video",
        model: originalJob.model,
        estimatedCost: originalJob.estimatedCost,
        createdAt: new Date().toISOString(),
      });
    }

    if (isUgcClone) {
      if (!isTerminal) {
        return retryError(
          400,
          `Can only retry completed or failed UGC clone jobs. Current status: ${originalJob.status}`,
        );
      }

      const cloneRequest = buildCloneRetryRequest(input, originalJob.model);

      if (!cloneRequest) {
        return retryError(
          400,
          "This UGC clone job is missing saved inputs or contains conflicting reference sources, so it cannot be retried.",
        );
      }

      if (cloneRequest.collectionAssetId) {
        await resolveCollectionAssetLocalPath(cloneRequest.collectionAssetId);
      }

      const { jobId, estimatedCost, modelId } = await generateClone(cloneRequest);
      ensureCloneWorkerRunning();

      return retryQueued({
        id: jobId,
        originalJobId: id,
        status: "queued",
        type: "video",
        model: modelId,
        estimatedCost,
        createdAt: new Date().toISOString(),
      });
    }

    if (isCharacterVideo) {
      if (originalJob.status !== "failed") {
        return retryError(
          400,
          `Can only retry failed character video jobs. Current status: ${originalJob.status}`,
        );
      }
      const avatarId = asRetryString(input.avatarId);
      const prompt = asRetryString(input.prompt) ?? originalJob.prompt;
      if (!avatarId) {
        return retryError(
          400,
          "This character video is missing its saved avatar identity.",
        );
      }
      const savedAnchorJobId = asRetryString(input.anchorJobId);
      const savedAnchorJob = savedAnchorJobId
        ? await getJob(savedAnchorJobId)
        : null;
      const reusableAnchorJobId =
        savedAnchorJob?.status === "completed" &&
        savedAnchorJob.outputs.some((output) => output.type === "image")
          ? savedAnchorJob.id
          : undefined;
      const result = await generateCharacterVideo({
        avatarId,
        prompt,
        model: originalJob.model,
        duration: asRetryNumber(input.duration),
        aspectRatio: asRetryString(input.aspectRatio),
        enableAudio: asRetryBoolean(input.enableAudio),
        negativePrompt: asRetryString(input.negativePrompt),
        anchorJobId: reusableAnchorJobId,
      });
      return retryQueued({
        id: result.jobId,
        originalJobId: id,
        status: "queued",
        type: "video",
        model: result.model,
        estimatedCost: result.estimatedCost,
        createdAt: new Date().toISOString(),
      });
    }

    if (originalJob.status !== "failed") {
      return retryError(
        400,
        `Can only retry failed jobs. Current status: ${originalJob.status}`,
      );
    }

    let newJobId: string;

    if (originalJob.type === "image") {
      const model = getModel(originalJob.model);
      if (!model || model.type !== "image") {
        return retryError(
          400,
          `Model ${originalJob.model} is not available for image retry`,
        );
      }
      const retryReferences = await resolveImageRetryReferences(input, {
        maximumReferences: model.capabilities.maxReferenceImages ?? 0,
        supportsReferences: model.capabilities.referenceImages === true,
      });
      const imageRequest: ImageGenerationRequest = {
        prompt: originalJob.prompt,
        model: originalJob.model,
        aspectRatio: asRetryString(input.aspectRatio),
        numImages: asRetryNumber(input.numImages),
        negativePrompt: asRetryString(input.negativePrompt),
        imageUrls: retryReferences.executionUrls,
        editEndpoint:
          retryReferences.hasServerOwnedReferences ||
          asRetryBoolean(input.editEndpoint),
        enableWebSearch: asRetryBoolean(input.enableWebSearch),
        thinkingLevel:
          input.thinkingLevel === "high" || input.thinkingLevel === "minimal"
            ? input.thinkingLevel
            : undefined,
      };
      newJobId = await generateImage(imageRequest, undefined, {
        jobInput: {
          ...input,
          referenceFileIds: retryReferences.referenceFileIds,
          collectionAssetIds: retryReferences.collectionAssetIds,
          referenceImageUrls: retryReferences.hasServerOwnedReferences
            ? undefined
            : retryReferences.persistedRemoteUrls,
          imageUrls: undefined,
        },
      });
    } else if (originalJob.type === "video") {
      const model = getModel(originalJob.model);
      if (!model || model.type !== "video") {
        return retryError(
          400,
          `Model ${originalJob.model} is not available for video retry`,
        );
      }
      const retryReference = await resolveVideoRetryReference(input, {
        supportsCollectionReference: model.capabilities.imageToVideo === true,
        supportsVideoReference: model.capabilities.videoToVideo === true,
      });
      const videoRequest: VideoGenerationRequest = {
        prompt: originalJob.prompt,
        model: originalJob.model,
        duration: asRetryNumber(input.duration),
        aspectRatio: asRetryString(input.aspectRatio),
        inputImageUrl:
          retryReference.executionUrl ?? asRetryString(input.inputImageUrl),
        enableAudio: asRetryBoolean(input.enableAudio),
        multiShot: parseRetryMultiShot(input.multiShot),
      };
      newJobId = await generateVideo(videoRequest, {
        jobInput: {
          ...input,
          collectionAssetIds: retryReference.collectionAssetIds,
          referenceFileId: retryReference.referenceFileId ?? undefined,
          inputImageUrl:
            retryReference.collectionAssetIds.length > 0 ||
            retryReference.referenceFileId
              ? undefined
              : asRetryString(input.inputImageUrl),
        },
      });
    } else {
      return retryError(400, `Unsupported job type: ${originalJob.type}`);
    }

    return retryQueued({
      id: newJobId,
      originalJobId: id,
      status: "queued",
      type: originalJob.type,
      model: originalJob.model,
      estimatedCost: originalJob.estimatedCost,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (
      error instanceof InvalidCloneRequestError ||
      error instanceof CollectionAssetRequestError
    ) {
      return retryError(400, error.message);
    }

    console.error("Failed to retry job:", error);
    return retryError(
      500,
      error instanceof Error ? error.message : "Failed to retry job",
    );
  }
}
