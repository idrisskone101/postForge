import type { ImageGenerationRequest } from "./types";
import { getModel, mapAspectRatioToFalFormat, calculateEstimatedCost } from "./models";
import { subscribeToGeneration } from "./fal-client";
import { createJob, startJob, completeJob, failJob, addGeneratedFile } from "@/lib/jobs/queue";
import { logCost } from "@/lib/costs/tracker";
import { storage, downloadFromUrl } from "@/lib/storage";
import { persistUgcReferenceImageFromJob } from "@/lib/ugc/reference-library";

export function buildImageProviderRequest(request: ImageGenerationRequest): {
  endpoint: string;
  payload: Record<string, unknown>;
} {
  const model = getModel(request.model);
  if (!model || model.type !== "image") {
    throw new Error(`Unknown image model: ${request.model}`);
  }

  const aspectRatio = request.aspectRatio ?? model.defaults.aspectRatio;
  const numImages = request.numImages ?? model.defaults.numImages ?? 1;
  const payload: Record<string, unknown> = {
    prompt: request.prompt,
    num_images: numImages,
    safety_tolerance: "6",
  };

  if (request.editEndpoint) {
    payload.aspect_ratio = aspectRatio;
  } else if (request.model === "gpt-image-2") {
    payload.image_size = mapAspectRatioToFalFormat(aspectRatio, request.model);
    payload.quality = "high";
    payload.output_format = "png";
  } else if (request.model === "flux-2-flex") {
    payload.image_size = { width: 1024, height: 1024 };
    payload.output_format = "jpeg";
  } else {
    payload.image_size = mapAspectRatioToFalFormat(aspectRatio, request.model);
  }

  if (request.negativePrompt) payload.negative_prompt = request.negativePrompt;
  if (request.imageUrls?.length) payload.image_urls = request.imageUrls;
  if (request.enableWebSearch) payload.enable_web_search = true;
  if (request.thinkingLevel) payload.thinking_level = request.thinkingLevel;

  return {
    endpoint: request.editEndpoint ? `${model.endpoint}/edit` : model.endpoint,
    payload,
  };
}

export async function generateImage(
  request: ImageGenerationRequest,
  postProcess?: (buffer: Buffer) => Promise<Buffer>,
  options?: {
    jobInput?: Record<string, unknown>;
    jobTags?: string[];
  },
): Promise<string> {
  const model = getModel(request.model);
  if (!model) {
    throw new Error(`Unknown model: ${request.model}`);
  }
  if (model.type !== "image") {
    throw new Error(`Model ${request.model} is not an image model`);
  }

  const numImages = request.numImages ?? model.defaults.numImages ?? 1;
  const estimatedCost = calculateEstimatedCost(request.model, { numImages });

  const job = await createJob({
    type: "image",
    model: request.model,
    prompt: request.prompt,
    input: options?.jobInput ?? (request as unknown as Record<string, unknown>),
    estimatedCost,
    tags: options?.jobTags,
  });

  // Fire-and-forget: do not await
  executeImageGeneration(job.id, request, postProcess).catch((err) =>
    failJob(job.id, err.message).catch(console.error)
  );

  return job.id;
}

async function executeImageGeneration(
  jobId: string,
  request: ImageGenerationRequest,
  postProcess?: (buffer: Buffer) => Promise<Buffer>,
): Promise<void> {
  const startTime = Date.now();

  await startJob(jobId);

  const providerRequest = buildImageProviderRequest(request);
  const result = await subscribeToGeneration(
    providerRequest.endpoint,
    providerRequest.payload
  );

  const data = result.data as {
    images?: {
      url: string;
      width?: number;
      height?: number;
      content_type?: string;
    }[];
  };
  const images = data.images ?? [];

  await Promise.all(images.map(async (image, i) => {
    let { buffer, contentType } = await downloadFromUrl(image.url);

    // Apply post-processing if provided (e.g., color/quality matching)
    if (postProcess) {
      buffer = await postProcess(buffer);
      contentType = "image/jpeg"; // post-process outputs JPEG
    }

    const extension = contentType.includes("png") ? "png" : "jpg";
    const filename = `${jobId}-${i}.${extension}`;
    const localPath = await storage.save("images", filename, buffer);

    await addGeneratedFile({
      jobId,
      type: "image",
      originalUrl: image.url,
      localPath,
      filename,
      mimeType: contentType,
      width: image.width,
      height: image.height,
      fileSizeBytes: buffer.length,
    });
  }));

  const durationMs = Date.now() - startTime;
  const actualCost = calculateEstimatedCost(request.model, {
    numImages: images.length,
  });

  await completeJob(jobId, { imageCount: images.length }, durationMs);

  try {
    await persistUgcReferenceImageFromJob(jobId);
  } catch (error) {
    console.error(
      `[ugc-reference-library] Failed to persist saved reference for job ${jobId}:`,
      error
    );
  }

  await logCost(jobId, request.model, "image", actualCost, {
    numImages: images.length,
    prompt: request.prompt,
  });
}
