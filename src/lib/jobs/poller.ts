import { hostname } from "os";
import { randomUUID } from "crypto";
import { getPendingFalJobs } from "@/lib/jobs/queue";
import { prisma } from "@/lib/db";
import {
  pollSingleJob,
  type FalJobPollOutcome,
} from "@/lib/jobs/poll-fal-job";

const POLL_INTERVAL_MS = 10_000;
const POLL_LOCK_MS = 2 * 60 * 1000;
const SLIDESHOW_JOB_TAG = "slideshow";
const pollerId = `${hostname()}:${process.pid}:${randomUUID()}`;

const globalForPoller = globalThis as unknown as {
  __postforge_poller_interval: ReturnType<typeof setInterval> | null;
  __postforge_poller_polling: boolean;
  __postforge_poller_heartbeat: number;
};

const STALE_THRESHOLD_MS = POLL_INTERVAL_MS * 3;

function isPollerRunning(): boolean {
  // HMR can kill the interval while globalThis still holds the old timer id.
  if (!globalForPoller.__postforge_poller_interval) return false;
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
    runPendingFalJobTick().catch(console.error);
  }, POLL_INTERVAL_MS);

  runPendingFalJobTick().catch(console.error);
}

export function stopPoller(): void {
  if (globalForPoller.__postforge_poller_interval) {
    clearInterval(globalForPoller.__postforge_poller_interval);
    globalForPoller.__postforge_poller_interval = null;
  }
}

export type FalJobPollTickResult = {
  candidates: number;
  claimed: number;
  completed: number;
  failed: number;
  waiting: number;
  errors: number;
};

export async function runPendingFalJobTick(
  options: { slideshowOnly?: boolean; limit?: number } = {}
): Promise<FalJobPollTickResult> {
  const emptyResult: FalJobPollTickResult = {
    candidates: 0,
    claimed: 0,
    completed: 0,
    failed: 0,
    waiting: 0,
    errors: 0,
  };
  if (globalForPoller.__postforge_poller_polling) return emptyResult;
  globalForPoller.__postforge_poller_polling = true;

  try {
    const jobs = await getPendingFalJobs({
      ...(options.slideshowOnly ? { tag: SLIDESHOW_JOB_TAG } : {}),
      limit: options.limit ?? 20,
    });
    if (jobs.length === 0) {
      if (!options.slideshowOnly) stopPoller();
      return emptyResult;
    }

    const outcomes = await Promise.allSettled(
      jobs.map((job) => claimAndPollSingleJob(job.id))
    );
    return outcomes.reduce<FalJobPollTickResult>(
      (result, settled) => {
        if (settled.status === "rejected") {
          result.errors += 1;
          console.error("[Poller] Failed to poll a Fal job:", settled.reason);
          return result;
        }
        const outcome = settled.value;
        if (outcome !== "unclaimed") result.claimed += 1;
        if (outcome === "completed") result.completed += 1;
        if (outcome === "failed") result.failed += 1;
        if (outcome === "waiting") result.waiting += 1;
        return result;
      },
      { ...emptyResult, candidates: jobs.length }
    );
  } finally {
    globalForPoller.__postforge_poller_polling = false;
  }
}

async function claimAndPollSingleJob(jobId: string): Promise<FalJobPollOutcome> {
  const now = new Date();
  const claimed = await prisma.generationJob.updateMany({
    where: {
      id: jobId,
      status: "processing",
      falRequestId: { not: null },
      OR: [{ lockOwner: null }, { lockExpiresAt: null }, { lockExpiresAt: { lt: now } }],
    },
    data: {
      lockOwner: pollerId,
      lockExpiresAt: new Date(now.getTime() + POLL_LOCK_MS),
      lastPolledAt: now,
    },
  });
  if (claimed.count !== 1) return "unclaimed";

  try {
    const job = await prisma.generationJob.findUnique({ where: { id: jobId } });
    if (!job) return "unclaimed";
    return await pollSingleJob(job);
  } finally {
    await prisma.generationJob.updateMany({
      where: { id: jobId, lockOwner: pollerId },
      data: { lockOwner: null, lockExpiresAt: null },
    });
  }
}
