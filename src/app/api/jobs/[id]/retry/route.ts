import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/queue";
import { generateImage } from "@/lib/ai/generate-image";
import { generateVideo } from "@/lib/ai/generate-video";
import type { ImageGenerationRequest, VideoGenerationRequest } from "@/lib/ai/types";
import {
  generateClone,
  InvalidCloneRequestError,
  type CloneGenerationRequest,
  type SourceVideoSnapshot,
} from "@/lib/ugc/generate-clone";
import { ensureCloneWorkerRunning } from "@/lib/ugc/clone-worker";

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

function buildCloneRetryRequest(
  input: Record<string, unknown>,
  fallbackModel: string
): CloneGenerationRequest | null {
  const sourceVideoSnapshot = parseSourceVideoSnapshot(input.sourceVideo);
  const tiktokSourceId = asString(input.tiktokSourceId) ?? sourceVideoSnapshot?.sourceId;
  const tiktokVideoPath = sourceVideoSnapshot?.localPath ?? asString(input.tiktokVideoPath);
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
    modelId: asString(input.modelId) ?? fallbackModel,
    referenceImageFileId: asString(input.referenceImageFileId),
    savedReferenceId: asString(input.savedReferenceId),
    durationSec: asNumber(input.durationSec),
    removeTextOverlays: input.removeTextOverlays === true,
    sourceVideoSnapshot,
  };
}

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
          { error: "This UGC clone job is missing the saved source, avatar, or video inputs needed to retry it." },
          { status: 400 }
        );
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
      const imageRequest: ImageGenerationRequest = {
        prompt: originalJob.prompt,
        model: originalJob.model,
        aspectRatio: asString(input.aspectRatio),
        numImages: asNumber(input.numImages),
        negativePrompt: asString(input.negativePrompt),
        imageUrls: (input.referenceImageUrls ?? input.imageUrls) as string[] | undefined,
        editEndpoint: asBoolean(input.editEndpoint),
        enableWebSearch: asBoolean(input.enableWebSearch),
        thinkingLevel:
          input.thinkingLevel === "high" || input.thinkingLevel === "minimal"
            ? input.thinkingLevel
            : undefined,
      };
      newJobId = await generateImage(imageRequest);
    } else if (originalJob.type === "video") {
      const videoRequest: VideoGenerationRequest = {
        prompt: originalJob.prompt,
        model: originalJob.model,
        duration: asNumber(input.duration),
        aspectRatio: asString(input.aspectRatio),
        inputImageUrl: asString(input.inputImageUrl),
        enableAudio: asBoolean(input.enableAudio),
      };
      newJobId = await generateVideo(videoRequest);
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
    if (error instanceof InvalidCloneRequestError) {
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
