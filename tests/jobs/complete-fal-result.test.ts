import assert from "node:assert/strict";

import type { GeneratedFile } from "../../src/generated/prisma/client";
import {
  completeFalImageJob,
  persistFalImageOutputs,
  persistFalVideoOutput,
  type CompleteFalResultDependencies,
} from "../../src/lib/jobs/complete-fal-result";

const now = new Date("2026-08-18T01:00:00.000Z");

function generatedFile(overrides: Partial<GeneratedFile> = {}): GeneratedFile {
  return {
    id: "file-1",
    jobId: "job-1",
    type: "image",
    originalUrl: "https://fal.example/image.png",
    localPath: "images/job-1-0.png",
    filename: "job-1-0.png",
    mimeType: "image/png",
    width: 1080,
    height: 1920,
    durationSec: null,
    fileSizeBytes: 4,
    reviewStatus: "needs_review",
    data: null,
    createdAt: now,
    ...overrides,
  };
}

(async () => {
  const saved: Array<{ filename: string; mimeType: string }> = [];
  const completed: Array<{ output: unknown; durationMs: number }> = [];
  const costs: Array<{ type: string; amount: number }> = [];
  const dependencies: CompleteFalResultDependencies = {
    downloadFromUrl: async () => ({
      buffer: Buffer.from("png"),
      contentType: "image/png",
    }),
    saveFile: async (_kind, filename) => `images/${filename}`,
    addGeneratedFile: async (params) => {
      saved.push({ filename: params.filename, mimeType: params.mimeType });
      return generatedFile({
        filename: params.filename,
        mimeType: params.mimeType,
        localPath: params.localPath,
      });
    },
    completeJob: async (_jobId, output, durationMs) => {
      completed.push({ output, durationMs });
    },
    logCost: async (_jobId, _modelId, type, amount) => {
      costs.push({ type, amount });
    },
    calculateEstimatedCost: () => 0.08,
    now: () => now.getTime(),
  };

  const primary = await persistFalImageOutputs(
    "job-1",
    [{ url: "https://fal.example/image.png", width: 1080, height: 1920 }],
    undefined,
    dependencies,
  );
  assert.equal(primary?.filename, "job-1-0.png");
  assert.deepEqual(saved, [{ filename: "job-1-0.png", mimeType: "image/png" }]);

  await completeFalImageJob(
    "job-1",
    "nano-banana-2",
    "editorial still",
    1,
    now.getTime() - 1_000,
    dependencies,
  );
  assert.equal(completed.length, 1);
  assert.deepEqual(completed[0].output, { imageCount: 1 });
  assert.equal(completed[0].durationMs, 1_000);
  assert.deepEqual(costs, [{ type: "image", amount: 0.08 }]);

  const processed: CompleteFalResultDependencies = {
    ...dependencies,
    downloadFromUrl: async () => ({
      buffer: Buffer.from("raw"),
      contentType: "image/png",
    }),
    saveFile: async (_kind, filename) => `images/${filename}`,
    addGeneratedFile: async (params) =>
      generatedFile({
        filename: params.filename,
        mimeType: params.mimeType,
      }),
  };
  const jpeg = await persistFalImageOutputs(
    "job-2",
    [{ url: "https://fal.example/image.png" }],
    async () => Buffer.from("jpeg"),
    processed,
  );
  assert.equal(jpeg?.filename, "job-2-0.jpg");
  assert.equal(jpeg?.mimeType, "image/jpeg");

  const videos: string[] = [];
  await persistFalVideoOutput(
    "job-3",
    { url: "https://fal.example/video.mp4", width: 1080, height: 1920 },
    5,
    {
      ...dependencies,
      downloadFromUrl: async () => ({
        buffer: Buffer.from("mp4"),
        contentType: "video/mp4",
      }),
      saveFile: async (_kind, filename) => {
        videos.push(filename);
        return `videos/${filename}`;
      },
      addGeneratedFile: async (params) =>
        generatedFile({
          type: "video",
          filename: params.filename,
          durationSec: params.durationSec ?? null,
        }),
    },
  );
  assert.deepEqual(videos, ["job-3-0.mp4"]);

  console.log("complete fal result tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
