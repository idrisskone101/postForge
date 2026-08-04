import {
  runPendingFalJobTick,
  type FalJobPollTickResult,
} from "@/lib/jobs/poller";
import {
  recoverQueuedSlideshowImageJobs,
  type QueuedSlideshowImageRecoveryResult,
} from "@/lib/ai/slideshow-image";
import { runSlideshowAutomationTick } from "@/lib/slideshow/automation-worker";

export type SlideshowMaintenanceDependencies = {
  runAutomationTick: () => Promise<void>;
  recoverQueuedImageJobs: () => Promise<QueuedSlideshowImageRecoveryResult>;
  recoverImageJobs: () => Promise<FalJobPollTickResult>;
};

const productionDependencies: SlideshowMaintenanceDependencies = {
  runAutomationTick: runSlideshowAutomationTick,
  recoverQueuedImageJobs: () =>
    recoverQueuedSlideshowImageJobs({ limit: 20 }),
  recoverImageJobs: () =>
    runPendingFalJobTick({ slideshowOnly: true, limit: 20 }),
};

/**
 * Durable, process-independent slideshow maintenance entrypoint.
 *
 * Vercel invokes this from cron, so persisted Fal requests continue to be
 * polled and attached even when no browser is open and no interval survived a
 * server restart.
 */
export async function runSlideshowMaintenanceTick(
  dependencies: SlideshowMaintenanceDependencies = productionDependencies
) {
  // A serverless request can end after reserving a job but before its original
  // caller reaches Fal. Resume those durable intents before polling requests
  // that already have a provider id.
  const queuedImageJobs = await dependencies.recoverQueuedImageJobs();
  const [, imageJobs] = await Promise.all([
    dependencies.runAutomationTick(),
    dependencies.recoverImageJobs(),
  ]);

  return { queuedImageJobs, imageJobs };
}
