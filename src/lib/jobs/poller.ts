import { checkQueueStatus, getQueueResult } from "@/lib/ai/fal-client";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import {
  getPendingVideoJobs,
  completeJob,
  failJob,
  addGeneratedFile,
} from "@/lib/jobs/queue";
import { logCost } from "@/lib/costs/tracker";
import { storage, downloadFromUrl } from "@/lib/storage";
import type { GenerationJob } from "@/generated/prisma/client";

const POLL_INTERVAL_MS = 10_000;
const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CONSECUTIVE_ERRORS = 5;

// Track consecutive polling errors per job
const errorCounts = new Map<string, number>();

const globalForPoller = globalThis as unknown as {
  __postforge_poller_interval: ReturnType<typeof setInterval> | null;
  __postforge_poller_polling: boolean;
  __postforge_poller_heartbeat: number;
};

// Detect stale pollers (e.g. killed by HMR but globalThis still holds old interval ID)
const STALE_THRESHOLD_MS = POLL_INTERVAL_MS * 3;

function isPollerRunning(): boolean {
  if (!globalForPoller.__postforge_poller_interval) return false;
  // Check heartbeat — if too old, the interval is stale (HMR killed it)
  const lastBeat = globalForPoller.__postforge_poller_heartbeat ?? 0;
  if (Date.now() - lastBeat > STALE_THRESHOLD_MS) {
    console.log("[Poller] Detected stale poller, restarting...");
    globalForPoller.__postforge_poller_interval = null;
    return false;
  }
  return true;
}

export function ensurePollerRunning(): void {
  if (isPollerRunning()) return;

  globalForPoller.__postforge_poller_polling = false;
  globalForPoller.__postforge_poller_heartbeat = Date.now();
  globalForPoller.__postforge_poller_interval = setInterval(() => {
    globalForPoller.__postforge_poller_heartbeat = Date.now();
    pollPendingJobs().catch(console.error);
  }, POLL_INTERVAL_MS);

  // Run immediately on first start
  pollPendingJobs().catch(console.error);
}

export function stopPoller(): void {
  if (globalForPoller.__postforge_poller_interval) {
    clearInterval(globalForPoller.__postforge_poller_interval);
    globalForPoller.__postforge_poller_interval = null;
  }
}

async function pollPendingJobs(): Promise<void> {
  // Prevent overlapping poll cycles
  if (globalForPoller.__postforge_poller_polling) return;
  globalForPoller.__postforge_poller_polling = true;

  try {
    const jobs = await getPendingVideoJobs();
    if (jobs.length === 0) {
      stopPoller();
      return;
    }

    await Promise.allSettled(jobs.map((job) => pollSingleJob(job)));
  } finally {
    globalForPoller.__postforge_poller_polling = false;
  }
}

async function pollSingleJob(job: GenerationJob): Promise<void> {
  const model = getModel(job.model);
  if (!model || !job.falRequestId) return;

  // Check for timeout
  if (job.startedAt) {
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    if (elapsed > TIMEOUT_MS) {
      await failJob(job.id, "Job timed out after 15 minutes");
      return;
    }
  }

  try {
    const status = await checkQueueStatus(model.endpoint, job.falRequestId);

    // Successful status check — reset error count
    errorCounts.delete(job.id);

    if (status.status === "COMPLETED") {
      try {
        const result = await getQueueResult(model.endpoint, job.falRequestId);
        const data = result.data as {
          video?: { url: string; width?: number; height?: number; content_type?: string };
          duration?: number;
          has_audio?: boolean;
        };

        if (data.video) {
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

        const input = job.input as Record<string, unknown>;
        const actualDuration = data.duration ?? (input.duration ? Number(input.duration) : model.defaults.duration ?? 5);
        const enableAudio = !!input.enable_audio;

        const actualCost = calculateEstimatedCost(job.model, {
          durationSec: actualDuration,
          enableAudio,
        });

        await completeJob(job.id, { video: data.video, duration: data.duration }, durationMs);

        await logCost(job.id, job.model, "video", actualCost, {
          durationSec: actualDuration,
          enableAudio,
          prompt: job.prompt,
        });
      } catch (resultErr) {
        console.error(`Failed to retrieve/download result for job ${job.id}:`, resultErr);
        const errBody = (resultErr as { body?: { detail?: Array<{ msg?: string }> } })?.body;
        if (errBody) console.error(`Error body:`, JSON.stringify(errBody, null, 2));
        const detailMsg = errBody?.detail?.[0]?.msg;
        const msg = detailMsg || (resultErr instanceof Error ? resultErr.message : "Failed to retrieve result");
        await failJob(job.id, msg);
      }
    }
    // If IN_PROGRESS or IN_QUEUE, do nothing — will be polled again
  } catch (err) {
    console.error(`Error polling job ${job.id}:`, err);
    const errBody = (err as { body?: unknown })?.body;
    if (errBody) console.error(`Error body:`, JSON.stringify(errBody, null, 2));

    // 4xx errors (bad input, not found) — fail immediately
    const errStatus = (err as { status?: number })?.status;
    const is4xx = (errStatus && errStatus >= 400 && errStatus < 500) ||
      (err instanceof Error && /4\d{2}|not.found|bad.request|invalid/i.test(err.message));
    if (is4xx) {
      const detailBody = (err as { body?: { detail?: Array<{ msg?: string }> } })?.body;
      const detailMsg = detailBody?.detail?.[0]?.msg;
      const msg = detailMsg || (err instanceof Error ? err.message : "Request failed");
      await failJob(job.id, msg);
      errorCounts.delete(job.id);
      return;
    }

    // 5xx/network errors — retry with count
    const count = (errorCounts.get(job.id) ?? 0) + 1;
    errorCounts.set(job.id, count);

    if (count >= MAX_CONSECUTIVE_ERRORS) {
      const msg = err instanceof Error ? err.message : "Polling failed after multiple retries";
      await failJob(job.id, msg);
      errorCounts.delete(job.id);
    }
  }
}
