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
  const avatarFullPath = await storage.ensureLocalFile(avatar.localPath);
  const videoFullPath = await storage.ensureLocalFile(request.tiktokVideoPath);

  // Extract first frame from the TikTok video
  const referenceFramePath = await extractReferenceFrame(videoFullPath);

  // Analyze the frame with Gemini to build a detailed scene prompt.
  // We pass poseEmphasis=true so the prompt explicitly describes the exact
  // starting pose — this ensures the reference image matches frame 0 of the
  // video, preventing the motion control model from needing to interpolate
  // from a mismatched pose at the start.
  const { promptJson, promptString, negativePrompt } =
    await analyzeSceneAndBuildPrompt(referenceFramePath, request.prompt, { poseEmphasis: true });

  // Upload avatar and TikTok frame.
  // Avatar 3x + frame 1x in image_urls — avatar dominates identity at 3:1 ratio
  // while the frame provides scene/background/angle context.
  // reference_images is NOT a real nano-banana-2 parameter (was being silently ignored).
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
    imageUrls: [avatarUrl, avatarUrl, avatarUrl, frameUrl],
    editEndpoint: true,
    thinkingLevel: "high",
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
