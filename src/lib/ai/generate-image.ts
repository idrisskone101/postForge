import type { ImageGenerationRequest } from "./types";
import { getModel, mapAspectRatioToFalFormat, calculateEstimatedCost } from "./models";
import { subscribeToGeneration } from "./fal-client";
import { createJob, startJob, completeJob, failJob, addGeneratedFile } from "@/lib/jobs/queue";
import { logCost } from "@/lib/costs/tracker";
import { storage, downloadFromUrl } from "@/lib/storage";

export async function generateImage(
  request: ImageGenerationRequest
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
    input: request as unknown as Record<string, unknown>,
    estimatedCost,
  });

  // Fire-and-forget: do not await
  executeImageGeneration(job.id, request).catch((err) =>
    failJob(job.id, err.message).catch(console.error)
  );

  return job.id;
}

async function executeImageGeneration(
  jobId: string,
  request: ImageGenerationRequest
): Promise<void> {
  const model = getModel(request.model)!;
  const startTime = Date.now();

  await startJob(jobId);

  const aspectRatio = request.aspectRatio ?? model.defaults.aspectRatio;
  const numImages = request.numImages ?? model.defaults.numImages ?? 1;

  const input: Record<string, unknown> = {
    prompt: request.prompt,
    num_images: numImages,
    enable_safety_checker: false,
  };

  // Edit endpoint uses aspect_ratio directly; text-to-image uses image_size mapped format
  if (request.editEndpoint) {
    input.aspect_ratio = aspectRatio;
  } else {
    input.image_size = mapAspectRatioToFalFormat(aspectRatio, request.model);
  }

  if (request.negativePrompt) {
    input.negative_prompt = request.negativePrompt;
  }

  if (request.imageUrls && request.imageUrls.length > 0) {
    input.image_urls = request.imageUrls;
  } else if (request.referenceImageUrls && request.referenceImageUrls.length > 0) {
    input.reference_images = request.referenceImageUrls;
  }

  if (request.enableWebSearch) {
    input.enable_web_search = true;
  }

  // Use edit endpoint variant if requested
  const endpoint = request.editEndpoint
    ? `${model.endpoint}/edit`
    : model.endpoint;

  const result = await subscribeToGeneration(endpoint, input);

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
    const { buffer, contentType } = await downloadFromUrl(image.url);

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

  await logCost(jobId, request.model, "image", actualCost, {
    numImages: images.length,
    prompt: request.prompt,
  });
}
