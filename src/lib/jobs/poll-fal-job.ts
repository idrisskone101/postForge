import { checkQueueStatus, getQueueResult } from "@/lib/ai/fal-client";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import {
  completeJob,
  failJob,
  addGeneratedFile,
} from "@/lib/jobs/queue";
import { logCost } from "@/lib/costs/tracker";
import { storage, downloadFromUrl } from "@/lib/storage";
import type { GeneratedFile, GenerationJob } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { attachSlideshowGeneratedFile } from "@/lib/slideshow/service";
import {
  persistFalImageOutputs,
  persistFalVideoOutput,
  completeFalImageJob,
  completeFalVideoJob,
  type CompleteFalResultDependencies,
} from "@/lib/jobs/complete-fal-result";

const TIMEOUT_MS = 15 * 60 * 1000;
const MAX_CONSECUTIVE_ERRORS = 5;
const errorCounts = new Map<string, number>();

export type FalJobPollOutcome = "completed" | "failed" | "waiting" | "unclaimed";

function isPermanentFalError(error: unknown) {
  const status = (error as { status?: number })?.status;
  if (status !== undefined && status >= 400 && status < 500) return true;
  return (
    error instanceof Error &&
    /4\d{2}|not.found|bad.request|invalid|completed without an output|could not be persisted/i.test(
      error.message
    )
  );
}

export type FalJobPollDependencies = {
  getModel: typeof getModel;
  calculateEstimatedCost: typeof calculateEstimatedCost;
  checkQueueStatus: (
    endpoint: string,
    requestId: string
  ) => Promise<{ status: string; error?: string; message?: string }>;
  getQueueResult: (
    endpoint: string,
    requestId: string
  ) => Promise<{ data: unknown }>;
  findPrimaryImage: (jobId: string) => Promise<GeneratedFile | null>;
  downloadFromUrl: typeof downloadFromUrl;
  saveFile: typeof storage.save;
  addGeneratedFile: typeof addGeneratedFile;
  attachSlideshowGeneratedFile: typeof attachSlideshowGeneratedFile;
  completeJob: typeof completeJob;
  failJob: typeof failJob;
  logCost: (
    jobId: string,
    modelId: string,
    type: string,
    amount: number,
    details?: Record<string, unknown>
  ) => Promise<unknown>;
  now: () => number;
};

const productionPollDependencies: FalJobPollDependencies = {
  getModel,
  calculateEstimatedCost,
  checkQueueStatus,
  getQueueResult,
  findPrimaryImage: (jobId) =>
    prisma.generatedFile.findFirst({
      where: { jobId, type: "image" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
  downloadFromUrl,
  saveFile: storage.save.bind(storage),
  addGeneratedFile,
  attachSlideshowGeneratedFile,
  completeJob,
  failJob,
  logCost,
  now: Date.now,
};

function falResultDependenciesFromPoller(
  dependencies: FalJobPollDependencies,
): CompleteFalResultDependencies {
  return {
    downloadFromUrl: dependencies.downloadFromUrl,
    saveFile: dependencies.saveFile,
    addGeneratedFile: dependencies.addGeneratedFile,
    completeJob: dependencies.completeJob,
    logCost: dependencies.logCost,
    calculateEstimatedCost: dependencies.calculateEstimatedCost,
    now: dependencies.now,
  };
}

function jobStartedAtMs(job: GenerationJob, now: () => number) {
  return job.startedAt ? new Date(job.startedAt).getTime() : now();
}

export async function pollSingleJob(
  job: GenerationJob,
  dependencies: FalJobPollDependencies = productionPollDependencies
): Promise<FalJobPollOutcome> {
  const model = dependencies.getModel(job.model);
  if (!model || !job.falRequestId) {
    await dependencies.failJob(
      job.id,
      "The generation provider or request id is unavailable"
    );
    return "failed";
  }
  const jobInput = job.input as Record<string, unknown>;
  const endpoint =
    typeof jobInput.falEndpoint === "string"
      ? jobInput.falEndpoint
      : model.endpoint;

  try {
    const status = await dependencies.checkQueueStatus(endpoint, job.falRequestId);
    const queueStatus = String(status.status);

    errorCounts.delete(job.id);

    if (queueStatus === "COMPLETED") {
      try {
        const result = await dependencies.getQueueResult(endpoint, job.falRequestId);
        if (model.type === "image") {
          const data = result.data as {
            images?: Array<{
              url: string;
              width?: number;
              height?: number;
              content_type?: string;
            }>;
          };
          const images = data.images ?? [];
          if (!images.length) {
            throw new Error("Image generation completed without an output");
          }
          const fal = falResultDependenciesFromPoller(dependencies);
          let primaryFile = await dependencies.findPrimaryImage(job.id);
          if (!primaryFile) {
            primaryFile = await persistFalImageOutputs(
              job.id,
              images,
              undefined,
              fal,
            );
          }
          if (!primaryFile) {
            throw new Error("Image generation output could not be persisted");
          }
          await dependencies.attachSlideshowGeneratedFile(job.id, primaryFile.id);
          await completeFalImageJob(
            job.id,
            job.model,
            job.prompt,
            images.length,
            jobStartedAtMs(job, dependencies.now),
            fal,
          );
          return "completed";
        }
        const data = result.data as {
          video?: { url: string; width?: number; height?: number; content_type?: string };
          duration?: number;
          has_audio?: boolean;
        };
        const fal = falResultDependenciesFromPoller(dependencies);

        if (data.video) {
          await persistFalVideoOutput(job.id, data.video, data.duration, fal);
        }

        const actualDuration =
          data.duration ??
          (jobInput.duration ? Number(jobInput.duration) : model.defaults.duration ?? 5);
        const enableAudio = !!jobInput.enable_audio;
        await completeFalVideoJob(
          job.id,
          job.model,
          job.prompt,
          { video: data.video, duration: data.duration },
          { durationSec: actualDuration, enableAudio },
          jobStartedAtMs(job, dependencies.now),
          fal,
        );
        return "completed";
      } catch (resultErr) {
        console.error(`Failed to retrieve/download result for job ${job.id}:`, resultErr);
        const errBody = (resultErr as { body?: { detail?: Array<{ msg?: string }> } })?.body;
        if (errBody) console.error(`Error body:`, JSON.stringify(errBody, null, 2));
        if (isPermanentFalError(resultErr)) {
          const detailMsg = errBody?.detail?.[0]?.msg;
          const msg =
            detailMsg ||
            (resultErr instanceof Error
              ? resultErr.message
              : "Failed to retrieve result");
          await dependencies.failJob(job.id, msg);
          return "failed";
        }
        // Fal results and remote files remain addressable after completion.
        // Keep the durable job processing so a later cron tick can retry a
        // transient result/download/storage/attachment failure.
        return "waiting";
      }
    }
    if (queueStatus === "FAILED") {
      const message =
        (status as { error?: string; message?: string }).error ??
        (status as { error?: string; message?: string }).message ??
        "fal.ai generation failed";
      await dependencies.failJob(job.id, message);
      return "failed";
    }

    // A completed Fal request must be recovered even when a process restart or
    // closed tab delayed the next poll beyond the normal timeout window.
    if (job.startedAt) {
      const elapsed = dependencies.now() - new Date(job.startedAt).getTime();
      if (elapsed > TIMEOUT_MS) {
        await dependencies.failJob(job.id, "Job timed out after 15 minutes");
        return "failed";
      }
    }

    return "waiting";
  } catch (err) {
    console.error(`Error polling job ${job.id}:`, err);
    const errBody = (err as { body?: unknown })?.body;
    if (errBody) console.error(`Error body:`, JSON.stringify(errBody, null, 2));

    const is4xx = isPermanentFalError(err);
    if (is4xx) {
      const detailBody = (err as { body?: { detail?: Array<{ msg?: string }> } })?.body;
      const detailMsg = detailBody?.detail?.[0]?.msg;
      const msg = detailMsg || (err instanceof Error ? err.message : "Request failed");
      await dependencies.failJob(job.id, msg);
      errorCounts.delete(job.id);
      return "failed";
    }

    const count = (errorCounts.get(job.id) ?? 0) + 1;
    errorCounts.set(job.id, count);

    if (count >= MAX_CONSECUTIVE_ERRORS) {
      const msg = err instanceof Error ? err.message : "Polling failed after multiple retries";
      await dependencies.failJob(job.id, msg);
      errorCounts.delete(job.id);
      return "failed";
    }
    return "waiting";
  }
}
