import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import { submitToQueue, uploadToFalStorage } from "@/lib/ai/fal-client";
import { createJob, failJob } from "@/lib/jobs/queue";
import { prisma } from "@/lib/db";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import { storage } from "@/lib/storage";
import { extractReferenceFrame } from "@/lib/ugc/extract-frame";

// Default prompts for motion control — keep minimal and scene-focused.
// Motion comes from the reference video; the prompt describes the scene context only.
const DEFAULT_CLONE_PROMPT_V3 =
  "@Element1 in the scene, natural environment lighting, consistent background, seamless scene continuity";
const DEFAULT_CLONE_PROMPT_V2 =
  "Person in the scene, natural environment lighting, consistent background, seamless scene continuity";

export interface CloneGenerationRequest {
  tiktokVideoPath: string;
  avatarId: string;
  prompt?: string;
  keepOriginalSound?: boolean;
  modelId?: string;
  referenceImageFileId?: string;
  durationSec?: number;
}

export async function generateClone(
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

  // Resolve full paths
  const avatarFullPath = storage.getFullPath(avatar.localPath);
  const videoFullPath = storage.getFullPath(request.tiktokVideoPath);

  let sceneImageUrl: string;
  let avatarUrl: string;
  let videoUrl: string;

  if (request.referenceImageFileId) {
    // Use the pre-generated reference image as the scene image.
    // This image has the avatar's face composited into the video's environment,
    // giving Kling both the correct face identity AND scene context.
    const refFile = await prisma.generatedFile.findUnique({
      where: { id: request.referenceImageFileId },
    });
    if (!refFile) {
      throw new Error(`Reference image file not found: ${request.referenceImageFileId}`);
    }
    const refFullPath = storage.getFullPath(refFile.localPath);
    [sceneImageUrl, avatarUrl, videoUrl] = await Promise.all([
      uploadToFalStorage(refFullPath),
      uploadToFalStorage(avatarFullPath),
      uploadToFalStorage(videoFullPath),
    ]);
  } else {
    // Fall back to extracting a frame from the reference video
    const referenceFramePath = await extractReferenceFrame(videoFullPath);
    [avatarUrl, sceneImageUrl, videoUrl] = await Promise.all([
      uploadToFalStorage(avatarFullPath),
      uploadToFalStorage(referenceFramePath),
      uploadToFalStorage(videoFullPath),
    ]);
  }

  const rawDuration = request.durationSec ?? model.defaults.duration ?? 5;
  const minDuration = model.limits.minDuration ?? 1;
  const duration = Math.max(minDuration, Math.round(rawDuration));
  const estimatedCost = calculateEstimatedCost(modelId, { durationSec: duration });

  // Resolve the final prompt — V3 uses @Element1 for facial binding, V2 does not.
  const isV3 = modelId.startsWith("kling-3.0");
  const userPrompt = request.prompt?.trim();
  let finalPrompt: string;
  if (userPrompt) {
    // If user provided a prompt but didn't reference the element, prepend it (V3 only)
    finalPrompt = isV3 && !userPrompt.includes("@Element1")
      ? `@Element1 ${userPrompt}`
      : isV3 ? userPrompt : userPrompt.replace(/@Element1\s*/g, "");
  } else {
    finalPrompt = isV3 ? DEFAULT_CLONE_PROMPT_V3 : DEFAULT_CLONE_PROMPT_V2;
  }

  // Create job
  const job = await createJob({
    type: "video",
    model: modelId,
    prompt: finalPrompt,
    input: {
      ...request,
      avatarUrl,
      sceneImageUrl,
      videoUrl,
    } as unknown as Record<string, unknown>,
    estimatedCost,
  });

  // Set tags
  await prisma.generationJob.update({
    where: { id: job.id },
    data: { tags: ["ugc-clone"] },
  });

  try {
    // Build fal input — only documented parameters for
    // fal-ai/kling-video/v3/standard/motion-control
    const falInput: Record<string, unknown> = {
      image_url: sceneImageUrl,
      video_url: videoUrl,
      character_orientation: "video",
      prompt: finalPrompt,
    };

    // V3: Element binding — avatar face injected via @Element1 into the reference scene
    if (isV3) {
      falInput.elements = [
        { frontal_image_url: avatarUrl, reference_image_urls: [avatarUrl] },
      ];
    }

    if (request.keepOriginalSound !== undefined) {
      falInput.keep_original_sound = request.keepOriginalSound;
    }

    // Submit to queue
    const queueResult = await submitToQueue(model.endpoint, falInput);
    const requestId = queueResult.request_id;

    // Update job
    await prisma.generationJob.update({
      where: { id: job.id },
      data: { status: "processing", startedAt: new Date(), falRequestId: requestId },
    });

    // Start poller
    ensurePollerRunning();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to submit job";
    await failJob(job.id, msg);
    throw err;
  }

  return { jobId: job.id, estimatedCost, modelId };
}
