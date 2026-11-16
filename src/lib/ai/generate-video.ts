import type { VideoGenerationRequest, VideoSwapGenerationRequest } from "./types";
import { getModel, calculateEstimatedCost } from "./models";
import { submitToQueue } from "./fal-client";
import { createJob, failJob } from "@/lib/jobs/queue";
import { prisma } from "@/lib/db";
import { ensurePollerRunning } from "@/lib/jobs/poller";

interface FalVideoInputShape {
  resolution: string;
  durationAsString?: boolean;
  /** Image-to-video endpoints take the frame's aspect ratio from the start image. */
  startImageField?: "image_url" | "start_image_url";
  audioField?: "generate_audio" | "audio" | "generate_audio_switch";
  extra?: Record<string, unknown>;
}

const VIDEO_INPUT_SHAPES: Record<string, FalVideoInputShape> = {
  "kling-4.0": { resolution: "720p" },
  "kling-4.0-i2v": { resolution: "720p", startImageField: "start_image_url" },
  "kling-4.0-flash": { resolution: "720p" },
  "minimax-h3-max": { resolution: "768P", extra: { prompt_expansion_mode: "balanced" } },
  "seedance-2.5": { resolution: "720p", durationAsString: true, audioField: "generate_audio" },
  "seedance-2.5-i2v": {
    resolution: "720p",
    durationAsString: true,
    audioField: "generate_audio",
    startImageField: "image_url",
  },
  "wan-3.0": { resolution: "720p", audioField: "audio" },
  "wan-3.0-i2v": { resolution: "720p", audioField: "audio", startImageField: "start_image_url" },
  "gemini-omni-flash-1.2": { resolution: "720p" },
  "flux-3-video": {
    resolution: "720p",
    audioField: "generate_audio",
    extra: { safety_tolerance: 4 },
  },
  "grok-imagine-video-1.5": { resolution: "720p" },
  "pixverse-v6": { resolution: "720p", audioField: "generate_audio_switch" },
};

function buildShapedVideoInput(
  shape: FalVideoInputShape,
  request: VideoGenerationRequest,
  duration: number,
  aspectRatio: string
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    prompt: request.prompt,
    duration: shape.durationAsString ? String(duration) : duration,
    resolution: shape.resolution,
    ...shape.extra,
  };
  if (shape.startImageField) {
    if (request.inputImageUrl) input[shape.startImageField] = request.inputImageUrl;
  } else {
    input.aspect_ratio = aspectRatio;
  }
  if (shape.audioField) input[shape.audioField] = request.enableAudio === true;
  return input;
}

export function buildVideoInput(
  modelId: string,
  request: VideoGenerationRequest
): Record<string, unknown> {
  const model = getModel(modelId)!;
  const duration = request.duration ?? model.defaults.duration ?? 5;
  const aspectRatio = request.aspectRatio ?? model.defaults.aspectRatio;

  const shape = VIDEO_INPUT_SHAPES[modelId];
  if (shape) return buildShapedVideoInput(shape, request, duration, aspectRatio);

  if (modelId.startsWith("kling")) {
    const input: Record<string, unknown> = {
      prompt: request.prompt,
      duration: String(duration),
      aspect_ratio: aspectRatio,
    };
    if (request.inputImageUrl && model.capabilities.imageToVideo) {
      if (modelId === "kling-3.0-i2v") {
        input.start_image_url = request.inputImageUrl;
        input.generate_audio = request.enableAudio === true;
      } else {
        input.image_url = request.inputImageUrl;
      }
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
      generate_audio: request.enableAudio === true,
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

  try {
    // Submit to queue
    const queueResult = await submitToQueue(model.endpoint, input);
    const requestId = queueResult.request_id;
    if (!requestId?.trim()) {
      throw new Error("The video provider did not return a request id");
    }

    // Update job with fal request ID and set to processing
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "processing", startedAt: new Date(), falRequestId: requestId },
    });

    // Start the poller
    ensurePollerRunning();
    return job.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to queue video generation";
    await failJob(job.id, message).catch(console.error);
    throw error;
  }
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

  try {
    const queueResult = await submitToQueue(model.endpoint, input);
    const requestId = queueResult.request_id;
    if (!requestId?.trim()) {
      throw new Error("The video provider did not return a request id");
    }

    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "processing", startedAt: new Date(), falRequestId: requestId },
    });

    ensurePollerRunning();
    return job.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to queue video swap";
    await failJob(job.id, message).catch(console.error);
    throw error;
  }
}
