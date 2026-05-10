import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { uploadToFalStorage } from "@/lib/ai/fal-client";
import { generateImage } from "@/lib/ai/generate-image";
import { calculateEstimatedCost } from "@/lib/ai/models";
import { extractReferenceFrame } from "@/lib/ugc/extract-frame";
import { analyzeSceneAndBuildPrompt } from "@/lib/ai/analyze-scene";
import { resolveIdentityReferenceUrlsForAvatar } from "@/lib/ugc/avatar-identity-pack";

export interface ReferenceImageRequest {
  tiktokVideoPath: string;
  tiktokSourceId?: string;
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

  const videoFullPath = await storage.ensureLocalFile(request.tiktokVideoPath);

  // Extract first frame from the TikTok video
  const referenceFramePath = await extractReferenceFrame(videoFullPath);

  // Build a lean fal-only edit prompt. The extracted frame is still supplied
  // to Nano Banana as the target visual reference, so no separate vision model
  // is needed for scene analysis.
  const { promptJson, promptString, negativePrompt } =
    await analyzeSceneAndBuildPrompt(referenceFramePath, request.prompt, { poseEmphasis: true });

  // Upload identity references and TikTok frame.
  // Completed identity packs provide multiple face angles; if the pack is not
  // ready yet we preserve the old behavior by repeating the avatar fallback.
  const [identityReferences, frameUrl] = await Promise.all([
    resolveIdentityReferenceUrlsForAvatar(request.avatarId),
    uploadToFalStorage(referenceFramePath),
  ]);

  const generationRequest = {
    prompt: promptString,
    negativePrompt,
    model: modelId,
    aspectRatio: "9:16",
    numImages: 1,
    imageUrls: [...identityReferences.identityReferenceUrls, frameUrl],
    editEndpoint: true,
    thinkingLevel: "high" as const,
  };

  const jobId = await generateImage(
    generationRequest,
    undefined,
    {
      jobTags: ["ugc-clone-ref"],
      jobInput: {
        model: modelId,
        aspectRatio: "9:16",
        numImages: 1,
        negativePrompt,
        imageUrls: [...identityReferences.identityReferenceUrls, frameUrl],
        editEndpoint: true,
        thinkingLevel: "high",
        tiktokVideoPath: request.tiktokVideoPath,
        tiktokSourceId: request.tiktokSourceId,
        avatarId: request.avatarId,
        identityPackId: identityReferences.identityPackId,
        identityReferenceRoles: identityReferences.identityReferenceRoles,
        usedAvatarFallback: identityReferences.usedAvatarFallback,
        prompt: request.prompt,
        sceneAnalysis: JSON.parse(JSON.stringify(promptJson)) as Record<string, unknown>,
      },
    }
  );

  return {
    jobId,
    estimatedCost,
    model: modelId,
  };
}
