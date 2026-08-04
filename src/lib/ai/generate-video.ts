import type { VideoGenerationRequest } from "./types";
import { getModel, calculateEstimatedCost } from "./models";
import { submitToQueue } from "./fal-client";
import { createJob } from "@/lib/jobs/queue";
import { prisma } from "@/lib/db";
import { ensurePollerRunning } from "@/lib/jobs/poller";

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

  // Build fal input
  const input: Record<string, unknown> = {
    prompt: request.prompt,
  };

  // Kling models expect duration as string
  if (request.model.startsWith("kling")) {
    input.duration = String(duration);
  } else {
    input.duration = duration;
  }

  const aspectRatio = request.aspectRatio ?? model.defaults.aspectRatio;
  input.aspect_ratio = aspectRatio;

  // Image-to-video: pass image_url
  if (request.inputImageUrl && model.capabilities.imageToVideo) {
    input.image_url = request.inputImageUrl;
  }

  // Audio for veo3
  if (request.enableAudio && model.capabilities.nativeAudio) {
    input.enable_audio = true;
  }

  // Multi-shot for kling
  if (request.multiShot && model.capabilities.multiShot) {
    input.multi_shot = request.multiShot;
  }

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
