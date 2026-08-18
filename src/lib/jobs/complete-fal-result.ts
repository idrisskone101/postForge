import type { GeneratedFile } from "@/generated/prisma/client";
import { calculateEstimatedCost } from "@/lib/ai/models";
import {
  addGeneratedFile,
  completeJob,
} from "@/lib/jobs/queue";
import { logCost } from "@/lib/costs/tracker";
import { downloadFromUrl, storage } from "@/lib/storage";

export type FalImageOutput = {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
};

export type FalVideoOutput = {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
};

export type CompleteFalResultDependencies = {
  downloadFromUrl: typeof downloadFromUrl;
  saveFile: typeof storage.save;
  addGeneratedFile: typeof addGeneratedFile;
  completeJob: typeof completeJob;
  logCost: (
    jobId: string,
    modelId: string,
    type: string,
    amount: number,
    details?: Record<string, unknown>,
  ) => Promise<unknown>;
  calculateEstimatedCost: typeof calculateEstimatedCost;
  now: () => number;
};

const productionCompleteFalDependencies: CompleteFalResultDependencies = {
  downloadFromUrl,
  saveFile: storage.save.bind(storage),
  addGeneratedFile,
  completeJob,
  logCost,
  calculateEstimatedCost,
  now: Date.now,
};

export async function persistFalImageOutputs(
  jobId: string,
  images: FalImageOutput[],
  postProcess: ((buffer: Buffer) => Promise<Buffer>) | undefined,
  dependencies: CompleteFalResultDependencies = productionCompleteFalDependencies,
): Promise<GeneratedFile | null> {
  const savedFiles = await Promise.all(
    images.map(async (image, index) => {
      let { buffer, contentType } = await dependencies.downloadFromUrl(image.url);
      if (postProcess) {
        buffer = await postProcess(buffer);
        contentType = "image/jpeg";
      }
      const extension = contentType.includes("png") ? "png" : "jpg";
      const filename = `${jobId}-${index}.${extension}`;
      const localPath = await dependencies.saveFile("images", filename, buffer);
      return dependencies.addGeneratedFile({
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
    }),
  );
  return savedFiles[0] ?? null;
}

export async function persistFalVideoOutput(
  jobId: string,
  video: FalVideoOutput,
  durationSec: number | undefined,
  dependencies: CompleteFalResultDependencies = productionCompleteFalDependencies,
) {
  const { buffer, contentType } = await dependencies.downloadFromUrl(video.url);
  const extension = contentType.includes("mp4") ? "mp4" : "webm";
  const filename = `${jobId}-0.${extension}`;
  const localPath = await dependencies.saveFile("videos", filename, buffer);
  await dependencies.addGeneratedFile({
    jobId,
    type: "video",
    originalUrl: video.url,
    localPath,
    filename,
    mimeType: contentType,
    width: video.width,
    height: video.height,
    durationSec,
    fileSizeBytes: buffer.length,
  });
}

export async function completeFalImageJob(
  jobId: string,
  modelId: string,
  prompt: string,
  imageCount: number,
  startedAtMs: number,
  dependencies: CompleteFalResultDependencies = productionCompleteFalDependencies,
) {
  const durationMs = dependencies.now() - startedAtMs;
  const actualCost = dependencies.calculateEstimatedCost(modelId, {
    numImages: imageCount,
  });
  await dependencies.completeJob(jobId, { imageCount }, durationMs);
  await dependencies
    .logCost(jobId, modelId, "image", actualCost, {
      numImages: imageCount,
      prompt,
    })
    .catch((error) => {
      console.error(`Failed to log cost for job ${jobId}:`, error);
    });
}

export async function completeFalVideoJob(
  jobId: string,
  modelId: string,
  prompt: string,
  output: Record<string, unknown>,
  costInput: { durationSec: number; enableAudio: boolean },
  startedAtMs: number,
  dependencies: CompleteFalResultDependencies = productionCompleteFalDependencies,
) {
  const durationMs = dependencies.now() - startedAtMs;
  const actualCost = dependencies.calculateEstimatedCost(modelId, costInput);
  await dependencies.completeJob(jobId, output, durationMs);
  await dependencies
    .logCost(jobId, modelId, "video", actualCost, {
      ...costInput,
      prompt,
    })
    .catch((error) => {
      console.error(`Failed to log cost for job ${jobId}:`, error);
    });
}
