import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { uploadToFalStorage } from "@/lib/ai/fal-client";
import { generateImage } from "@/lib/ai/generate-image";
import { calculateEstimatedCost } from "@/lib/ai/models";
import { extractReferenceFrame } from "@/lib/ugc/extract-frame";
import { analyzeSceneAndBuildPrompt } from "@/lib/ai/analyze-scene";

export interface ReferenceImageRequest {
  tiktokVideoPath: string;
  avatarId: string;
  prompt?: string;
  imageModel?: string;
}

export async function generateReferenceImage(
  request: ReferenceImageRequest
): Promise<{ jobId: string; estimatedCost: number; model: string }> {
  const modelId = request.imageModel ?? "nano-banana-2";
  const estimatedCost = calculateEstimatedCost(modelId, { numImages: 1 });

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

  // Extract first frame from the TikTok video
  const referenceFramePath = await extractReferenceFrame(videoFullPath);

  // Analyze the frame with Gemini to build a detailed scene prompt
  const { promptJson, promptString, negativePrompt } =
    await analyzeSceneAndBuildPrompt(referenceFramePath, request.prompt);

  // Upload avatar AND the TikTok frame to fal storage.
  // Passing the actual frame as a reference lets nano-banana-2 match
  // the real visual quality, lighting, and vibe — not just a text description.
  const [avatarUrl, frameUrl] = await Promise.all([
    uploadToFalStorage(avatarFullPath),
    uploadToFalStorage(referenceFramePath),
  ]);

  // Generate image using edit endpoint with avatar + TikTok frame as references.
  // Avatar first (primary identity), frame second (scene/quality reference).
  const jobId = await generateImage({
    prompt: promptString,
    negativePrompt,
    model: modelId,
    aspectRatio: "9:16",
    numImages: 1,
    imageUrls: [avatarUrl, frameUrl],
    editEndpoint: true,
  });

  // Tag the job as ugc-clone-ref and store the full scene analysis
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      tags: ["ugc-clone-ref"],
      input: {
        tiktokVideoPath: request.tiktokVideoPath,
        avatarId: request.avatarId,
        avatarUrl,
        prompt: request.prompt,
        sceneAnalysis: JSON.parse(JSON.stringify(promptJson)),
      },
    },
  });

  return {
    jobId,
    estimatedCost,
    model: modelId,
  };
}
