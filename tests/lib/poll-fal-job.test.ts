import assert from "node:assert/strict";

import type {
  GeneratedFile,
  GenerationJob,
} from "../../src/generated/prisma/client";
import { calculateEstimatedCost, getModel } from "../../src/lib/ai/models";
import {
  pollSingleJob,
  type FalJobPollDependencies,
} from "../../src/lib/jobs/poll-fal-job";

const now = new Date("2026-08-21T05:00:00.000Z");

function imageFile(jobId: string): GeneratedFile {
  return {
    id: `${jobId}-file`,
    jobId,
    type: "image",
    originalUrl: "https://fal.example/result.png",
    localPath: `images/${jobId}-0.png`,
    filename: `${jobId}-0.png`,
    mimeType: "image/png",
    width: 1080,
    height: 1920,
    durationSec: null,
    fileSizeBytes: 4,
    reviewStatus: "needs_review",
    data: null,
    createdAt: now,
  };
}

function job(overrides: Partial<GenerationJob> & Pick<GenerationJob, "id">): GenerationJob {
  return {
    type: "image",
    model: "nano-banana-2",
    status: "processing",
    prompt: "editorial still",
    input: { falEndpoint: "fal-ai/nano-banana-2" },
    output: null,
    falRequestId: `${overrides.id}-fal`,
    queueStage: null,
    lockOwner: null,
    lockExpiresAt: null,
    attempts: 0,
    nextAttemptAt: null,
    lastPolledAt: null,
    estimatedCost: 0.08,
    actualCost: null,
    durationMs: null,
    error: null,
    createdAt: now,
    startedAt: now,
    completedAt: null,
    tags: [],
    ...overrides,
  };
}

function dependencies(
  overrides: Partial<FalJobPollDependencies> = {},
): FalJobPollDependencies {
  return {
    getModel,
    calculateEstimatedCost,
    checkQueueStatus: async () => ({ status: "IN_QUEUE" }),
    getQueueResult: async () => ({ data: {} }),
    findPrimaryImage: async () => null,
    downloadFromUrl: async () => ({
      buffer: Buffer.from("png"),
      contentType: "image/png",
    }),
    saveFile: async (_kind, filename) => `images/${filename}`,
    addGeneratedFile: async (params) => imageFile(params.jobId),
    attachSlideshowGeneratedFile: async () => undefined,
    completeJob: async () => undefined,
    failJob: async () => undefined,
    logCost: async () => undefined,
    now: () => now.getTime(),
    ...overrides,
  };
}

async function withSilentConsole<T>(run: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => undefined;
  try {
    return await run();
  } finally {
    console.error = original;
  }
}

(async () => {
  const missing: string[] = [];
  const missingOutcome = await pollSingleJob(
    job({ id: "missing-model", falRequestId: "req" }),
    dependencies({
      getModel: () => undefined,
      failJob: async (_id, error) => {
        missing.push(error);
      },
    }),
  );
  assert.equal(missingOutcome, "failed");
  assert.deepEqual(missing, [
    "The generation provider or request id is unavailable",
  ]);

  const imageCalls: string[] = [];
  const file = imageFile("completed-image");
  const completedImage = await pollSingleJob(
    job({
      id: "completed-image",
      startedAt: new Date(now.getTime() - 60 * 60 * 1000),
    }),
    dependencies({
      checkQueueStatus: async () => ({ status: "COMPLETED" }),
      getQueueResult: async () => ({
        data: {
          images: [
            {
              url: file.originalUrl,
              width: file.width,
              height: file.height,
            },
          ],
        },
      }),
      saveFile: async () => {
        imageCalls.push("stored");
        return file.localPath;
      },
      addGeneratedFile: async () => {
        imageCalls.push("file-recorded");
        return file;
      },
      attachSlideshowGeneratedFile: async () => {
        imageCalls.push("attached");
      },
      completeJob: async () => {
        imageCalls.push("completed");
      },
    }),
  );
  assert.equal(completedImage, "completed");
  assert.deepEqual(imageCalls, [
    "stored",
    "file-recorded",
    "attached",
    "completed",
  ]);

  const emptyFailed: string[] = [];
  const emptyOutcome = await withSilentConsole(() =>
    pollSingleJob(
      job({ id: "empty-images" }),
      dependencies({
        checkQueueStatus: async () => ({ status: "COMPLETED" }),
        getQueueResult: async () => ({ data: { images: [] } }),
        failJob: async (_id, error) => {
          emptyFailed.push(error);
        },
      }),
    ),
  );
  assert.equal(emptyOutcome, "failed");
  assert.deepEqual(emptyFailed, [
    "Image generation completed without an output",
  ]);

  const providerFailed: string[] = [];
  const failedStatus = await pollSingleJob(
    job({ id: "provider-failed" }),
    dependencies({
      checkQueueStatus: async () => ({
        status: "FAILED",
        error: "safety filter",
      }),
      failJob: async (_id, error) => {
        providerFailed.push(error);
      },
    }),
  );
  assert.equal(failedStatus, "failed");
  assert.deepEqual(providerFailed, ["safety filter"]);

  const timeoutFailed: string[] = [];
  const timeoutOutcome = await pollSingleJob(
    job({
      id: "timed-out",
      startedAt: new Date(now.getTime() - 16 * 60 * 1000),
    }),
    dependencies({
      checkQueueStatus: async () => ({ status: "IN_PROGRESS" }),
      failJob: async (_id, error) => {
        timeoutFailed.push(error);
      },
    }),
  );
  assert.equal(timeoutOutcome, "failed");
  assert.deepEqual(timeoutFailed, ["Job timed out after 15 minutes"]);

  const queuedOutcome = await pollSingleJob(
    job({ id: "still-queued" }),
    dependencies({
      checkQueueStatus: async () => ({ status: "IN_QUEUE" }),
    }),
  );
  assert.equal(queuedOutcome, "waiting");

  let attachAttempts = 0;
  let completedAttempts = 0;
  let failedAttempts = 0;
  const retryFile = imageFile("retry-attach");
  const retryDependencies = dependencies({
    checkQueueStatus: async () => ({ status: "COMPLETED" }),
    getQueueResult: async () => ({
      data: { images: [{ url: retryFile.originalUrl }] },
    }),
    findPrimaryImage: async () => retryFile,
    attachSlideshowGeneratedFile: async () => {
      attachAttempts += 1;
      if (attachAttempts === 1) throw new Error("temporary database outage");
    },
    completeJob: async () => {
      completedAttempts += 1;
    },
    failJob: async () => {
      failedAttempts += 1;
    },
  });
  const firstRetry = await withSilentConsole(() =>
    pollSingleJob(job({ id: "retry-attach" }), retryDependencies),
  );
  const secondRetry = await pollSingleJob(
    job({ id: "retry-attach" }),
    retryDependencies,
  );
  assert.equal(firstRetry, "waiting");
  assert.equal(secondRetry, "completed");
  assert.equal(attachAttempts, 2);
  assert.equal(completedAttempts, 1);
  assert.equal(failedAttempts, 0);

  const serverFailed: string[] = [];
  const retrying = dependencies({
    checkQueueStatus: async () => {
      throw new Error("upstream 503");
    },
    failJob: async (_id, error) => {
      serverFailed.push(error);
    },
  });
  const serverOutcomes: string[] = [];
  await withSilentConsole(async () => {
    for (let i = 0; i < 5; i += 1) {
      serverOutcomes.push(
        await pollSingleJob(job({ id: "server-error" }), retrying),
      );
    }
  });
  assert.deepEqual(serverOutcomes, [
    "waiting",
    "waiting",
    "waiting",
    "waiting",
    "failed",
  ]);
  assert.deepEqual(serverFailed, ["upstream 503"]);

  const videoCalls: string[] = [];
  const completedVideo = await pollSingleJob(
    job({
      id: "completed-video",
      type: "video",
      model: "kling-3.0",
      input: { duration: 5, enable_audio: false },
    }),
    dependencies({
      checkQueueStatus: async () => ({ status: "COMPLETED" }),
      getQueueResult: async () => ({
        data: {
          video: {
            url: "https://fal.example/video.mp4",
            width: 1080,
            height: 1920,
          },
          duration: 5,
        },
      }),
      downloadFromUrl: async () => ({
        buffer: Buffer.from("mp4"),
        contentType: "video/mp4",
      }),
      saveFile: async (_kind, filename) => {
        videoCalls.push(`stored:${filename}`);
        return `videos/${filename}`;
      },
      addGeneratedFile: async (params) => {
        videoCalls.push(`file-recorded:${params.type}`);
        return imageFile(params.jobId);
      },
      completeJob: async () => {
        videoCalls.push("completed");
      },
    }),
  );
  assert.equal(completedVideo, "completed");
  assert.deepEqual(videoCalls, [
    "stored:completed-video-0.mp4",
    "file-recorded:video",
    "completed",
  ]);

  console.log("poll fal job tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
