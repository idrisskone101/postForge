import { prisma } from "@/lib/db";
import { calculateEstimatedCost, getModel } from "@/lib/ai/models";
import { getDefaultEditCapableImageModel } from "@/lib/ai/model-availability";
import { createJob } from "@/lib/jobs/queue";
import {
  CHARACTER_VIDEO_TAG,
  ensureCharacterVideoWorkerRunning,
  type CharacterVideoJobInput,
} from "./character-video-worker";

export type { CharacterVideoPayloadInput } from "./character-video-payload";
export { buildCharacterVideoProviderRequest } from "./character-video-payload";
export type { DurableCharacterSubmissionDependencies } from "./character-video-submit";
export { submitDurableCharacterIntent } from "./character-video-submit";
export {
  ensureCharacterVideoWorkerRunning,
  runCharacterVideoWorkerTick,
} from "./character-video-worker";

export interface CharacterVideoRequest {
  avatarId: string;
  prompt: string;
  model: string;
  duration?: number;
  aspectRatio?: string;
  enableAudio?: boolean;
  negativePrompt?: string;
  anchorJobId?: string;
}

export async function generateCharacterVideo(
  request: CharacterVideoRequest
): Promise<{ jobId: string; estimatedCost: number; model: string }> {
  const model = getModel(request.model);
  if (!model || model.type !== "video" || !model.capabilities.characterReference) {
    throw new Error(`Model ${request.model} does not support character video`);
  }

  const avatar = await prisma.avatar.findUnique({
    where: { id: request.avatarId },
    select: { id: true },
  });
  if (!avatar) throw new Error(`Avatar not found: ${request.avatarId}`);

  const duration = request.duration ?? model.defaults.duration ?? 5;
  const aspectRatio = request.aspectRatio ?? model.defaults.aspectRatio;
  const imageModel = await getDefaultEditCapableImageModel();
  const estimatedCost =
    (request.anchorJobId
      ? 0
      : calculateEstimatedCost(imageModel, { numImages: 1 })) +
    calculateEstimatedCost(request.model, {
      durationSec: duration,
      enableAudio: request.enableAudio,
    });

  const input: CharacterVideoJobInput = {
    avatarId: request.avatarId,
    prompt: request.prompt,
    model: request.model,
    duration,
    aspectRatio,
    enableAudio: request.enableAudio === true,
    ...(request.negativePrompt ? { negativePrompt: request.negativePrompt } : {}),
    ...(request.anchorJobId ? { anchorJobId: request.anchorJobId } : {}),
  };

  const job = await createJob({
    type: "video",
    model: request.model,
    prompt: request.prompt,
    input,
    estimatedCost,
    tags: [CHARACTER_VIDEO_TAG],
  });
  await prisma.generationJob.update({
    where: { id: job.id },
    data: { queueStage: "queued" },
  });
  ensureCharacterVideoWorkerRunning();

  return { jobId: job.id, estimatedCost, model: request.model };
}
