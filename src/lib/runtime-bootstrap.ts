import { ensurePollerRunning } from "@/lib/jobs/poller";
import { ensureAutomationSchedulerRunning } from "@/lib/automation-scheduler";
import { ensureSlideshowAutomationWorkerRunning } from "@/lib/slideshow/automation-worker";
import { backfillLegacyAssets } from "@/lib/storage-backfill";
import { backfillUgcReferenceImages } from "@/lib/ugc/reference-library";
import { ensureCloneWorkerRunning } from "@/lib/ugc/clone-worker";
import { migrateLegacyIntegrationConnections } from "@/lib/integrations/migration";

const globalForBootstrap = globalThis as unknown as {
  __postforge_runtime_bootstrap?: Promise<void>;
};

export async function bootstrapServerRuntime(): Promise<void> {
  if (!globalForBootstrap.__postforge_runtime_bootstrap) {
    globalForBootstrap.__postforge_runtime_bootstrap = (async () => {
      ensurePollerRunning();
      ensureCloneWorkerRunning();
      ensureAutomationSchedulerRunning();
      ensureSlideshowAutomationWorkerRunning();
      await backfillLegacyAssets();
      await backfillUgcReferenceImages();
      await migrateLegacyIntegrationConnections().catch(() => undefined);
    })();
  }

  await globalForBootstrap.__postforge_runtime_bootstrap;
}
