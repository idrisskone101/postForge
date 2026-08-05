import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/queue";
import { generateImage } from "@/lib/ai/generate-image";
import { generateVideo } from "@/lib/ai/generate-video";
import { getModel } from "@/lib/ai/models";
import type { ImageGenerationRequest, VideoGenerationRequest } from "@/lib/ai/types";
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
  asRetryBoolean,
  asRetryNumber,
  asRetryString,
  buildCloneRetryRequest,
  parseRetryMultiShot,
} from "@/lib/jobs/retry-inputs";
import {
  resolveImageRetryReferences,
  resolveVideoRetryReference,
} from "@/lib/jobs/retry-reference-resolution";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const originalJob = await getJob(id);

    if (!originalJob) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    const input = originalJob.input as Record<string, unknown>;
    const isUgcClone = originalJob.tags.includes("ugc-clone");
    const isTerminal =
      originalJob.status === "completed" || originalJob.status === "failed";

    if (isUgcClone) {
      if (!isTerminal) {
        return NextResponse.json(
          { error: `Can only retry completed or failed UGC clone jobs. Current status: ${originalJob.status}` },
          { status: 400 }
        );
      }

      const cloneRequest = buildCloneRetryRequest(input, originalJob.model);

      if (!cloneRequest) {
        return NextResponse.json(
          {
            error:
              "This UGC clone job is missing saved inputs or contains conflicting reference sources, so it cannot be retried.",
          },
          { status: 400 }
        );
      }

      if (cloneRequest.collectionAssetId) {
        // Resolve the server-owned collection record again for every retry.
        // Provider URLs are transient execution details, never persisted inputs.
        await resolveCollectionAssetLocalPath(cloneRequest.collectionAssetId);
      }

      const { jobId, estimatedCost, modelId } = await generateClone(cloneRequest);
      ensureCloneWorkerRunning();

      return NextResponse.json(
        {
          id: jobId,
          originalJobId: id,
          status: "queued",
          type: "video",
          model: modelId,
          estimatedCost,
          createdAt: new Date().toISOString(),
        },
        { status: 202 }
      );
    }

    if (originalJob.status !== "failed") {
      return NextResponse.json(
        { error: `Can only retry failed jobs. Current status: ${originalJob.status}` },
        { status: 400 }
      );
    }

    let newJobId: string;

    if (originalJob.type === "image") {
      const model = getModel(originalJob.model);
      if (!model || model.type !== "image") {
        return NextResponse.json(
          { error: `Model ${originalJob.model} is not available for image retry` },
          { status: 400 }
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
        return NextResponse.json(
          { error: `Model ${originalJob.model} is not available for video retry` },
          { status: 400 }
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
      return NextResponse.json(
        { error: `Unsupported job type: ${originalJob.type}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        id: newJobId,
        originalJobId: id,
        status: "queued",
        type: originalJob.type,
        model: originalJob.model,
        estimatedCost: originalJob.estimatedCost,
        createdAt: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    if (
      error instanceof InvalidCloneRequestError ||
      error instanceof CollectionAssetRequestError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("Failed to retry job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry job" },
      { status: 500 }
    );
  }
}
