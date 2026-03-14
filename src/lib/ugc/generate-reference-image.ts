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

  // Upload avatar and TikTok frame.
  // Avatar goes into image_urls (3x for identity dominance).
  // TikTok frame goes into reference_images (scene/background/angle context).
  // This keeps identity and scene in separate channels — the model uses the avatar
  // for WHO the person is, and the frame for WHERE they are and the camera angle.
  // FFmpeg then post-processes to match the frame's color/quality characteristics.
  const [avatarUrl, frameUrl] = await Promise.all([
    uploadToFalStorage(avatarFullPath),
    uploadToFalStorage(referenceFramePath),
  ]);

  const jobId = await generateImage({
    prompt: promptString,
    negativePrompt,
    model: modelId,
    aspectRatio: "9:16",
    numImages: 1,
    imageUrls: [avatarUrl, avatarUrl, avatarUrl],
    referenceImageUrls: [frameUrl],
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
