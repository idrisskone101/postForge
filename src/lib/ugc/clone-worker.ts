import { hostname } from "os";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { checkQueueStatus, getQueueResult } from "@/lib/ai/fal-client";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import { addGeneratedFile, completeJob, failJob } from "@/lib/jobs/queue";
import { logCost } from "@/lib/costs/tracker";
import { downloadFromUrl, storage } from "@/lib/storage";
import { clearCloneQueueLock, ensureCloneQueueSchema } from "@/lib/ugc/clone-queue-store";
import { processCloneJob } from "@/lib/ugc/generate-clone";
import type { GenerationJob } from "@/generated/prisma/client";

const UGC_CLONE_TAG = "ugc-clone";
const DEFAULT_ACTIVE_LIMIT = 2;
const POLL_INTERVAL_MS = 10_000;
const STALE_THRESHOLD_MS = POLL_INTERVAL_MS * 3;
const CLAIM_LOCK_MS = 30 * 60 * 1000;
const POLL_LOCK_MS = 2 * 60 * 1000;
const TIMEOUT_MS = 15 * 60 * 1000;
const MAX_CONSECUTIVE_ERRORS = 5;

const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;
const errorCounts = new Map<string, number>();

const globalForCloneWorker = globalThis as unknown as {
  __postforge_clone_worker_interval: ReturnType<typeof setInterval> | null;
  __postforge_clone_worker_ticking: boolean;
  __postforge_clone_worker_heartbeat: number;
  __postforge_clone_worker_inflight: Set<string>;
};

function activeLimit(): number {
  const parsed = Number.parseInt(process.env.UGC_CLONE_ACTIVE_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ACTIVE_LIMIT;
}

function addMs(ms: number): Date {
  return new Date(Date.now() + ms);
}

function isWorkerRunning(): boolean {
  if (!globalForCloneWorker.__postforge_clone_worker_interval) return false;

  const lastBeat = globalForCloneWorker.__postforge_clone_worker_heartbeat ?? 0;
  if (Date.now() - lastBeat > STALE_THRESHOLD_MS) {
    console.log("[ugc-clone-worker] Detected stale worker, restarting...");
    globalForCloneWorker.__postforge_clone_worker_interval = null;
    return false;
  }

  return true;
}

export function ensureCloneWorkerRunning(): void {
  if (!globalForCloneWorker.__postforge_clone_worker_inflight) {
    globalForCloneWorker.__postforge_clone_worker_inflight = new Set<string>();
  }

  if (!isWorkerRunning()) {
    globalForCloneWorker.__postforge_clone_worker_ticking = false;
    globalForCloneWorker.__postforge_clone_worker_heartbeat = Date.now();
    globalForCloneWorker.__postforge_clone_worker_interval = setInterval(() => {
      globalForCloneWorker.__postforge_clone_worker_heartbeat = Date.now();
      runCloneWorkerTick().catch(console.error);
    }, POLL_INTERVAL_MS);
  }

  runCloneWorkerTick().catch(console.error);
}

export function stopCloneWorker(): void {
  if (globalForCloneWorker.__postforge_clone_worker_interval) {
    clearInterval(globalForCloneWorker.__postforge_clone_worker_interval);
    globalForCloneWorker.__postforge_clone_worker_interval = null;
  }
}

async function runCloneWorkerTick(): Promise<void> {
  if (globalForCloneWorker.__postforge_clone_worker_ticking) return;
  globalForCloneWorker.__postforge_clone_worker_ticking = true;

  try {
    await ensureCloneQueueSchema();
    await recoverStaleCloneJobs();
    await pollSubmittedCloneJobs();
    await startQueuedCloneJobs();

    const remaining = await prisma.generationJob.count({
      where: {
        type: "video",
        tags: { has: UGC_CLONE_TAG },
        status: { in: ["queued", "processing"] },
      },
    });

    const inFlight = globalForCloneWorker.__postforge_clone_worker_inflight;
    if (remaining === 0 && (!inFlight || inFlight.size === 0)) {
      stopCloneWorker();
    }
  } finally {
    globalForCloneWorker.__postforge_clone_worker_ticking = false;
  }
}

async function recoverStaleCloneJobs(): Promise<void> {
  const now = new Date();

  await prisma.$executeRaw`
    UPDATE "GenerationJob"
    SET
      "status" = 'queued',
      "queueStage" = 'queued',
      "lockOwner" = NULL,
      "lockExpiresAt" = NULL,
      "nextAttemptAt" = ${now}
    WHERE
      "type" = 'video'
      AND "tags" @> ARRAY[${UGC_CLONE_TAG}]::TEXT[]
      AND "status" = 'processing'
      AND "falRequestId" IS NULL
      AND "lockExpiresAt" < ${now}
  `;

  await prisma.$executeRaw`
    UPDATE "GenerationJob"
    SET
      "queueStage" = 'submitted',
      "lockOwner" = NULL,
      "lockExpiresAt" = NULL
    WHERE
      "type" = 'video'
      AND "tags" @> ARRAY[${UGC_CLONE_TAG}]::TEXT[]
      AND "status" = 'processing'
      AND "falRequestId" IS NOT NULL
      AND "lockExpiresAt" < ${now}
  `;
}

async function startQueuedCloneJobs(): Promise<void> {
  const activeCount = await prisma.generationJob.count({
    where: {
      type: "video",
      tags: { has: UGC_CLONE_TAG },
      status: "processing",
    },
  });
  const slots = Math.max(0, activeLimit() - activeCount);
  if (slots === 0) return;

  const now = new Date();
  const candidates = await prisma.$queryRaw<Array<{ id: string; startedAt: Date | null }>>`
    SELECT "id", "startedAt"
    FROM "GenerationJob"
    WHERE
      "type" = 'video'
      AND "tags" @> ARRAY[${UGC_CLONE_TAG}]::TEXT[]
      AND "status" = 'queued'
      AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= ${now})
    ORDER BY "createdAt" ASC
    LIMIT ${slots}
  `;

  for (const job of candidates) {
    const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE "GenerationJob"
      SET
        "status" = 'processing',
        "queueStage" = 'preparing',
        "lockOwner" = ${workerId},
        "lockExpiresAt" = ${addMs(CLAIM_LOCK_MS)},
        "attempts" = "attempts" + 1,
        "startedAt" = COALESCE("startedAt", ${now}),
        "error" = NULL
      WHERE
        "id" = ${job.id}
        AND "status" = 'queued'
        AND ("lockOwner" IS NULL OR "lockExpiresAt" < ${now})
      RETURNING "id"
    `;

    if (claimed.length === 0) continue;

    globalForCloneWorker.__postforge_clone_worker_inflight.add(job.id);
    processCloneJob(job.id)
      .catch((error) => {
        console.error(`[ugc-clone-worker] Failed to process clone job ${job.id}:`, error);
      })
      .finally(() => {
        globalForCloneWorker.__postforge_clone_worker_inflight.delete(job.id);
      });
  }
}

async function pollSubmittedCloneJobs(): Promise<void> {
  const now = new Date();
  const stalePollCutoff = new Date(now.getTime() - POLL_INTERVAL_MS);
  const jobs = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "GenerationJob"
    WHERE
      "type" = 'video'
      AND "tags" @> ARRAY[${UGC_CLONE_TAG}]::TEXT[]
      AND "status" = 'processing'
      AND "falRequestId" IS NOT NULL
      AND ("lockOwner" IS NULL OR "lockExpiresAt" < ${now})
      AND ("lastPolledAt" IS NULL OR "lastPolledAt" <= ${stalePollCutoff})
    ORDER BY "lastPolledAt" ASC NULLS FIRST, "createdAt" ASC
    LIMIT ${activeLimit()}
  `;

  await Promise.allSettled(jobs.map((job) => claimAndPollCloneJob(job.id)));
}

async function claimAndPollCloneJob(jobId: string): Promise<void> {
  const now = new Date();
  const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE "GenerationJob"
    SET
      "lockOwner" = ${workerId},
      "lockExpiresAt" = ${addMs(POLL_LOCK_MS)},
      "lastPolledAt" = ${now}
    WHERE
      "id" = ${jobId}
      AND "status" = 'processing'
      AND "falRequestId" IS NOT NULL
      AND ("lockOwner" IS NULL OR "lockExpiresAt" < ${now})
    RETURNING "id"
  `;

  if (claimed.length === 0) return;

  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  try {
    await pollCloneJob(job);
  } finally {
    await releaseCloneLock(job.id);
  }
}

async function releaseCloneLock(jobId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "GenerationJob"
    SET "lockOwner" = NULL, "lockExpiresAt" = NULL
    WHERE
      "id" = ${jobId}
      AND "status" = 'processing'
      AND "lockOwner" = ${workerId}
  `;
}

async function failCloneJob(jobId: string, error: string): Promise<void> {
  await failJob(jobId, error);
  await clearCloneQueueLock(jobId, "failed");
}

function getNumber(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

async function pollCloneJob(job: GenerationJob): Promise<void> {
  const model = getModel(job.model);
  if (!model || !job.falRequestId) return;

  if (job.startedAt) {
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    if (elapsed > TIMEOUT_MS) {
      await failCloneJob(job.id, "Job timed out after 15 minutes");
      errorCounts.delete(job.id);
      return;
    }
  }

  try {
    const status = await checkQueueStatus(model.endpoint, job.falRequestId);
    const queueStatus = String(status.status);

    errorCounts.delete(job.id);

    if (queueStatus === "COMPLETED") {
      await prisma.$executeRaw`
        UPDATE "GenerationJob"
        SET "queueStage" = 'downloading', "lockExpiresAt" = ${addMs(POLL_LOCK_MS)}
        WHERE "id" = ${job.id}
      `;

      const result = await getQueueResult(model.endpoint, job.falRequestId);
      const data = result.data as {
        video?: { url: string; width?: number; height?: number; content_type?: string };
        duration?: number;
        has_audio?: boolean;
      };

      const existingOutput = await prisma.generatedFile.findFirst({
        where: { jobId: job.id, type: "video" },
      });

      if (!existingOutput && data.video) {
        const { buffer, contentType } = await downloadFromUrl(data.video.url);

        const extension = contentType.includes("mp4") ? "mp4" : "webm";
        const filename = `${job.id}-0.${extension}`;
        const localPath = await storage.save("videos", filename, buffer);

        await addGeneratedFile({
          jobId: job.id,
          type: "video",
          originalUrl: data.video.url,
          localPath,
          filename,
          mimeType: contentType,
          width: data.video.width,
          height: data.video.height,
          durationSec: data.duration,
          fileSizeBytes: buffer.length,
        });
      }

      const startTime = job.startedAt ? new Date(job.startedAt).getTime() : Date.now();
      const durationMs = Date.now() - startTime;
      const input = (job.input ?? {}) as Record<string, unknown>;
      const actualDuration =
        data.duration ??
        getNumber(input, "durationSec") ??
        getNumber(input, "duration") ??
        model.defaults.duration ??
        5;
      const textErasureCost = getNumber(input, "textErasureCost") ?? 0;
      const actualCost =
        calculateEstimatedCost(job.model, { durationSec: actualDuration }) + textErasureCost;

      await completeJob(job.id, { video: data.video, duration: data.duration }, durationMs);
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { actualCost },
      });
      await clearCloneQueueLock(job.id, "completed");

      await logCost(job.id, job.model, "video", actualCost, {
        durationSec: actualDuration,
        prompt: job.prompt,
        textErasureCost,
      });
      return;
    }

    if (queueStatus === "FAILED") {
      const errorMessage =
        (status as { error?: string; message?: string }).error ??
        (status as { error?: string; message?: string }).message ??
        "fal.ai generation failed";
      await failCloneJob(job.id, errorMessage);
    }
  } catch (err) {
    console.error(`[ugc-clone-worker] Error polling job ${job.id}:`, err);
    const errBody = (err as { body?: unknown })?.body;
    if (errBody) console.error("Error body:", JSON.stringify(errBody, null, 2));

    const errStatus = (err as { status?: number })?.status;
    const is4xx =
      (errStatus !== undefined && errStatus >= 400 && errStatus < 500) ||
      (err instanceof Error && /4\d{2}|not.found|bad.request|invalid/i.test(err.message));
    if (is4xx) {
      const detailBody = (err as { body?: { detail?: Array<{ msg?: string }> } })?.body;
      const detailMsg = detailBody?.detail?.[0]?.msg;
      const msg = detailMsg || (err instanceof Error ? err.message : "Request failed");
      await failCloneJob(job.id, msg);
      errorCounts.delete(job.id);
      return;
    }

    const count = (errorCounts.get(job.id) ?? 0) + 1;
    errorCounts.set(job.id, count);

    if (count >= MAX_CONSECUTIVE_ERRORS) {
      const msg = err instanceof Error ? err.message : "Polling failed after multiple retries";
      await failCloneJob(job.id, msg);
      errorCounts.delete(job.id);
    }
  }
}
