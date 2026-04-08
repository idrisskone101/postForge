import { ensurePollerRunning } from "@/lib/jobs/poller";
import { backfillLegacyAssets } from "@/lib/storage-backfill";
import { backfillUgcReferenceImages } from "@/lib/ugc/reference-library";

const globalForBootstrap = globalThis as unknown as {
  __postforge_runtime_bootstrap?: Promise<void>;
};

export async function bootstrapServerRuntime(): Promise<void> {
  if (!globalForBootstrap.__postforge_runtime_bootstrap) {
    globalForBootstrap.__postforge_runtime_bootstrap = (async () => {
      ensurePollerRunning();
      await backfillLegacyAssets();
      await backfillUgcReferenceImages();
    })();
  }

  await globalForBootstrap.__postforge_runtime_bootstrap;
}
