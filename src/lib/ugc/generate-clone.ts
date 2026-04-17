import * as fs from "fs/promises";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import { submitToQueue, uploadToFalStorage } from "@/lib/ai/fal-client";
import { createJob, failJob } from "@/lib/jobs/queue";
import { prisma } from "@/lib/db";
import { ensurePollerRunning } from "@/lib/jobs/poller";
import { storage } from "@/lib/storage";
import { extractReferenceFrame } from "@/lib/ugc/extract-frame";
import { eraseTextFromVideo } from "@/lib/ugc/erase-text";
import { normalizeVideoForMotionControl } from "@/lib/ugc/normalize-video";

// Default prompts for motion control.
// When a reference image is provided, it already contains the avatar in the scene,
// so we use a bare-minimum prompt — let the image speak for itself.
const DEFAULT_CLONE_PROMPT_WITH_REF =
  "Person performing the actions from the reference video, consistent appearance";
const DEFAULT_CLONE_PROMPT_V3 =
  "@Element1 in the scene, natural environment lighting, consistent background, seamless scene continuity";
const DEFAULT_CLONE_PROMPT_V2 =
  "Person in the scene, natural environment lighting, consistent background, seamless scene continuity";

export interface CloneGenerationRequest {
  tiktokVideoPath: string;
  tiktokSourceId?: string;
  avatarId: string;
  prompt?: string;
  keepOriginalSound?: boolean;
  modelId?: string;
  referenceImageFileId?: string;
  savedReferenceId?: string;
  durationSec?: number;
  removeTextOverlays?: boolean;
}

export class InvalidCloneRequestError extends Error {}

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
  const avatarFullPath = await storage.ensureLocalFile(avatar.localPath);

  // Optional: strip text overlays from the reference video before motion control.
  // This runs Bria Video Eraser on fal.ai and saves a cleaned copy locally.
  let videoPath = request.tiktokVideoPath;
  let textErasureCost = 0;
  if (request.removeTextOverlays) {
    const rawDurationForErase = request.durationSec ?? 5;
    console.log(`[ugc-clone] Erasing text overlays from video (${rawDurationForErase}s)...`);
    const eraseResult = await eraseTextFromVideo(videoPath, rawDurationForErase);
    videoPath = eraseResult.cleanedPath;
    textErasureCost = eraseResult.cost;
    console.log(`[ugc-clone] Text erasure complete → ${videoPath} (cost: $${textErasureCost.toFixed(3)})`);
  }

  // Normalize video for optimal motion control: constant 30fps CFR,
  // trim to first scene (removes app screenshots / product cuts at end).
  const rawVideoFullPath = await storage.ensureLocalFile(videoPath);
  console.log("[ugc-clone] Normalizing video for motion control (30fps CFR, scene trim)...");
  const videoFullPath = await normalizeVideoForMotionControl(rawVideoFullPath);
  console.log(`[ugc-clone] Normalized video → ${videoFullPath}`);

  const hasRefImage = !!request.referenceImageFileId || !!request.savedReferenceId;
  let sceneImageUrl: string;
  let avatarUrl: string | null = null;
  let videoUrl: string;

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
    } else {
      // Reference image already has the avatar composited into the scene.
      // We only need the reference image + the TikTok video — no separate avatar upload.
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
    // No reference image — fall back to extracting a frame + sending avatar separately
    const referenceFramePath = await extractReferenceFrame(videoFullPath);
    let avatarUrlResult: string;
    [avatarUrlResult, sceneImageUrl, videoUrl] = await Promise.all([
      uploadToFalStorage(avatarFullPath),
      uploadToFalStorage(referenceFramePath),
      uploadToFalStorage(videoFullPath),
    ]);
    avatarUrl = avatarUrlResult;

    // Clean up temp reference frame
    fs.unlink(referenceFramePath).catch((err) => {
      console.warn(`[ugc-clone] Failed to cleanup reference frame: ${referenceFramePath}`, err);
    });
  }

  // Clean up temp normalized video (already uploaded to fal storage)
  if (videoFullPath !== rawVideoFullPath) {
    fs.unlink(videoFullPath).catch((err) => {
      console.warn(`[ugc-clone] Failed to cleanup normalized video: ${videoFullPath}`, err);
    });
  }

  const rawDuration = request.durationSec ?? model.defaults.duration ?? 5;
  const minDuration = model.limits.minDuration ?? 1;
  const duration = Math.max(minDuration, Math.round(rawDuration));
  const estimatedCost = calculateEstimatedCost(modelId, { durationSec: duration }) + textErasureCost;

  // Resolve the final prompt.
  // When a reference image is provided, keep it minimal — the image already
  // contains the avatar in the scene, so extra scene/identity description is noise.
  // Only use @Element1 and elements array when there's NO reference image (fallback path).
  const isV3 = modelId.startsWith("kling-3.0");
  const userPrompt = request.prompt?.trim();
  let finalPrompt: string;

  if (hasRefImage) {
    // Minimal prompt — reference image handles identity + scene
    finalPrompt = userPrompt || DEFAULT_CLONE_PROMPT_WITH_REF;
  } else if (userPrompt) {
    // No reference image — V3 uses @Element1 for facial binding
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
    // Build fal input for motion-control endpoint.
    // NOTE: The motion control endpoint only accepts: image_url, video_url,
    // character_orientation, prompt, keep_original_sound, elements.
    // Parameters like cfg_scale, duration, aspect_ratio, negative_prompt
    // are silently ignored — output duration/aspect come from the reference video.
    const falInput: Record<string, unknown> = {
      image_url: sceneImageUrl,
      video_url: videoUrl,
      character_orientation: "video",
      prompt: finalPrompt,
    };

    // Only use element binding when there's NO reference image (fallback path)
    if (!hasRefImage && isV3 && avatarUrl) {
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
