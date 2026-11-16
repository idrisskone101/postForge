import { ensurePollerRunning } from "@/lib/jobs/poller";
import { ensureAutomationSchedulerRunning } from "@/lib/automation-scheduler";
import { ensureSlideshowAutomationWorkerRunning } from "@/lib/slideshow/automation-worker";
import { backfillLegacyAssets } from "@/lib/storage-backfill";
import { backfillUgcReferenceImages } from "@/lib/ugc/reference-library";
import { ensureCloneWorkerRunning } from "@/lib/ugc/clone-worker";
import { migrateLegacyIntegrationConnections } from "@/lib/integrations/migration";
import { isDemoMode } from "@/lib/demo/mode";

const globalForBootstrap = globalThis as unknown as {
  __postforge_runtime_bootstrap?: Promise<void>;
};

export async function bootstrapServerRuntime(): Promise<void> {
  if (!globalForBootstrap.__postforge_runtime_bootstrap) {
    globalForBootstrap.__postforge_runtime_bootstrap = (async () => {
      if (isDemoMode()) {
        // A demo build runs no workers, backfills, or provider migrations. It
        // only keeps its own sample database restored.
        const { startDemoWorkspace } = await import("@/lib/demo/restore");
        await startDemoWorkspace();
        return;
      }
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
