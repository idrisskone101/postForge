import { prisma } from "@/lib/db";
import { automationInclude } from "@/lib/slideshow/automation-draft";
import { processDueAutomation } from "@/lib/slideshow/automation-run";

const DEFAULT_TICK_INTERVAL_MS = 30_000;
const DEFAULT_BATCH_SIZE = 5;
const STALE_HEARTBEAT_MS = DEFAULT_TICK_INTERVAL_MS * 4;

const globalForAutomationWorker = globalThis as unknown as {
  __postforge_slideshow_automation_interval?: ReturnType<typeof setInterval> | null;
  __postforge_slideshow_automation_ticking?: boolean;
  __postforge_slideshow_automation_heartbeat?: number;
};

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function tickIntervalMs() {
  return positiveInteger(
    process.env.SLIDESHOW_AUTOMATION_TICK_MS,
    DEFAULT_TICK_INTERVAL_MS,
  );
}

function batchSize() {
  return positiveInteger(
    process.env.SLIDESHOW_AUTOMATION_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
  );
}

function isWorkerRunning() {
  if (!globalForAutomationWorker.__postforge_slideshow_automation_interval) {
    return false;
  }
  const heartbeat =
    globalForAutomationWorker.__postforge_slideshow_automation_heartbeat ?? 0;
  if (Date.now() - heartbeat > STALE_HEARTBEAT_MS) {
    globalForAutomationWorker.__postforge_slideshow_automation_interval = null;
    return false;
  }
  return true;
}

export function ensureSlideshowAutomationWorkerRunning(): void {
  if (process.env.SLIDESHOW_AUTOMATION_WORKER_DISABLED === "1") return;
  if (isWorkerRunning()) return;

  globalForAutomationWorker.__postforge_slideshow_automation_ticking = false;
  globalForAutomationWorker.__postforge_slideshow_automation_heartbeat = Date.now();
  const interval = setInterval(() => {
    globalForAutomationWorker.__postforge_slideshow_automation_heartbeat = Date.now();
    runSlideshowAutomationTick().catch((error) => {
      console.error("[slideshow-automation-worker] Tick failed:", error);
    });
  }, tickIntervalMs());
  // The worker should not keep a one-off Node process alive on its own.
  interval.unref?.();
  globalForAutomationWorker.__postforge_slideshow_automation_interval = interval;

  // The immediate query recovers due rows and expired claim leases after restart.
  runSlideshowAutomationTick().catch((error) => {
    console.error("[slideshow-automation-worker] Initial tick failed:", error);
  });
}

export function stopSlideshowAutomationWorker(): void {
  const interval =
    globalForAutomationWorker.__postforge_slideshow_automation_interval;
  if (interval) clearInterval(interval);
  globalForAutomationWorker.__postforge_slideshow_automation_interval = null;
}

export async function runSlideshowAutomationTick(): Promise<void> {
  if (globalForAutomationWorker.__postforge_slideshow_automation_ticking) return;
  globalForAutomationWorker.__postforge_slideshow_automation_ticking = true;

  try {
    const now = new Date();
    const due = await prisma.slideshowAutomation.findMany({
      where: {
        status: "active",
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
      },
      include: automationInclude,
      orderBy: [{ nextRunAt: "asc" }, { createdAt: "asc" }],
      take: batchSize(),
    });

    await Promise.allSettled(
      due.map((automation) => processDueAutomation(automation, now)),
    );
  } finally {
    globalForAutomationWorker.__postforge_slideshow_automation_ticking = false;
  }
}
