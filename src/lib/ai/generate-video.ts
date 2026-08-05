import type { VideoGenerationRequest, VideoSwapGenerationRequest } from "./types";
import { getModel, calculateEstimatedCost } from "./models";
import { submitToQueue } from "./fal-client";
import { createJob } from "@/lib/jobs/queue";
import { prisma } from "@/lib/db";
import { ensurePollerRunning } from "@/lib/jobs/poller";

function buildVideoInput(
  modelId: string,
  request: VideoGenerationRequest
): Record<string, unknown> {
  const model = getModel(modelId)!;
  const duration = request.duration ?? model.defaults.duration ?? 5;
  const aspectRatio = request.aspectRatio ?? model.defaults.aspectRatio;

  if (modelId.startsWith("kling")) {
    const input: Record<string, unknown> = {
      prompt: request.prompt,
      duration: String(duration),
      aspect_ratio: aspectRatio,
    };
    if (request.inputImageUrl && model.capabilities.imageToVideo) {
      input.image_url = request.inputImageUrl;
    }
    if (request.multiShot && model.capabilities.multiShot) {
      input.multi_shot = request.multiShot;
    }
    return input;
  }

  if (modelId === "veo3" || modelId === "veo3.1") {
    return {
      prompt: request.prompt,
      duration,
      resolution: "1080p",
      audio: request.enableAudio === true,
      ...(request.inputImageUrl ? { image_url: request.inputImageUrl } : {}),
    };
  }

  if (modelId === "seedance-2.0") {
    return {
      prompt: request.prompt,
      duration: String(duration),
      resolution: "720p",
      aspect_ratio: aspectRatio,
      generate_audio: true,
    };
  }

  if (modelId === "minimax-h3") {
    return {
      prompt: request.prompt,
      duration,
      resolution: "2K",
      aspect_ratio: aspectRatio,
    };
  }

  if (modelId === "gemini-omni-flash") {
    return {
      prompt: request.prompt,
      aspect_ratio: aspectRatio,
      duration,
    };
  }

  // Fallback: pass through the shared video shape
  const input: Record<string, unknown> = {
    prompt: request.prompt,
    duration,
    aspect_ratio: aspectRatio,
  };
  if (request.inputImageUrl && model.capabilities.imageToVideo) {
    input.image_url = request.inputImageUrl;
  }
  if (request.enableAudio && model.capabilities.nativeAudio) {
    input.enable_audio = true;
  }
  if (request.multiShot && model.capabilities.multiShot) {
    input.multi_shot = request.multiShot;
  }
  return input;
}

function buildSwapInput(request: VideoSwapGenerationRequest): Record<string, unknown> {
  if (request.model === "pixverse-swap") {
    return {
      video_url: request.videoUrl,
      image_url: request.referenceImageUrl ?? "",
      mode: request.swapMode ?? "person",
      keyframe_id: request.keyframeId ?? 1,
      resolution: request.resolution ?? "720p",
      original_sound_switch: request.keepOriginalSound ?? true,
    };
  }

  // gemini-omni-edit: prompt-driven video edit
  return {
    video_url: request.videoUrl,
    prompt: request.prompt,
  };
}

export async function generateVideo(
  request: VideoGenerationRequest,
  options?: { jobInput?: Record<string, unknown> }
): Promise<string> {
  const model = getModel(request.model);
  if (!model) {
    throw new Error(`Unknown model: ${request.model}`);
  }
  if (model.type !== "video") {
    throw new Error(`Model ${request.model} is not a video model`);
  }

  const duration = request.duration ?? model.defaults.duration ?? 5;
  const estimatedCost = calculateEstimatedCost(request.model, {
    durationSec: duration,
    enableAudio: request.enableAudio,
  });

  const job = await createJob({
    type: "video",
    model: request.model,
    prompt: request.prompt,
    input: options?.jobInput ?? (request as unknown as Record<string, unknown>),
    estimatedCost,
  });

  const input = buildVideoInput(request.model, request);

  // Submit to queue
  const queueResult = await submitToQueue(model.endpoint, input);
  const requestId = queueResult.request_id;

  // Update job with fal request ID and set to processing
  await prisma.generationJob.update({
    where: { id: job.id },
    data: { status: "processing", startedAt: new Date(), falRequestId: requestId },
  });

  // Start the poller
  ensurePollerRunning();

  return job.id;
}

export async function generateVideoSwap(
  request: VideoSwapGenerationRequest,
  options?: { jobInput?: Record<string, unknown> }
): Promise<string> {
  const model = getModel(request.model);
  if (!model) {
    throw new Error(`Unknown model: ${request.model}`);
  }
  if (!model.capabilities.subjectSwap) {
    throw new Error(`Model ${request.model} is not a video swap model`);
  }
  if (request.model === "pixverse-swap" && !request.referenceImageUrl) {
    throw new Error("PixVerse Swap requires a reference image");
  }
  if (!request.videoUrl) {
    throw new Error("A source video is required for subject swap");
  }

  const estimatedCost = calculateEstimatedCost(request.model, {
    durationSec: model.defaults.duration ?? 5,
  });

  const job = await createJob({
    type: "video",
    model: request.model,
    prompt: request.prompt,
    input: options?.jobInput ?? (request as unknown as Record<string, unknown>),
    estimatedCost,
    tags: ["video-swap"],
  });

  const input = buildSwapInput(request);

  const queueResult = await submitToQueue(model.endpoint, input);
  const requestId = queueResult.request_id;

  await prisma.generationJob.update({
    where: { id: job.id },
    data: { status: "processing", startedAt: new Date(), falRequestId: requestId },
  });

  ensurePollerRunning();

  return job.id;
}
