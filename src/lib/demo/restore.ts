import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { workspaceFeatureKey, type WorkspaceFeature } from "@/lib/workspace-feature-store";
import { DemoDatabaseGuardError, isSafeDemoDatabase } from "./database-guard";
import { demoResetIntervalMinutes, isDemoMode } from "./mode";
import { buildDemoSeed, loadDemoManifest, type DemoSeed } from "./seed";

/** Row written by every restore. Its presence is what marks a database as the demo's. */
export const DEMO_MARKER_KEY = "demo/workspace-marker.json";

const RESTORE_LOCK = "postforge-demo-restore";

/** Put the sample workspace back: wipe the demo database and write the seed. */
export async function restoreDemoWorkspace(now = new Date()): Promise<void> {
  if (!isDemoMode()) {
    throw new Error("restoreDemoWorkspace only runs in a demo build");
  }
  const seed = buildDemoSeed(await loadDemoManifest(), now);

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${RESTORE_LOCK}, 0))`;
      if (!isSafeDemoDatabase(await readDatabaseState(tx))) {
        throw new DemoDatabaseGuardError();
      }
      await clearWorkspace(tx);
      await writeSeed(tx, seed, now);
    },
    { timeout: 60_000, maxWait: 15_000 }
  );
}

const globalForDemo = globalThis as unknown as {
  __postforge_demo_restore_interval?: ReturnType<typeof setInterval>;
};

/**
 * Boot step for a demo build: restore once, then on a timer. A failed first
 * restore is fatal on purpose, so a misconfigured demo never serves anything.
 */
export async function startDemoWorkspace(): Promise<void> {
  await restoreDemoWorkspace();
  if (globalForDemo.__postforge_demo_restore_interval) return;

  const interval = setInterval(() => {
    restoreDemoWorkspace().catch((error) => {
      console.error("[demo] scheduled restore failed", error);
    });
  }, demoResetIntervalMinutes() * 60_000);
  interval.unref?.();
  globalForDemo.__postforge_demo_restore_interval = interval;
}

async function readDatabaseState(tx: Prisma.TransactionClient) {
  const [marker, ...counts] = await Promise.all([
    tx.storedAsset.findUnique({ where: { key: DEMO_MARKER_KEY }, select: { key: true } }),
    tx.generationJob.count(),
    tx.generatedFile.count(),
    tx.avatar.count(),
    tx.tikTokSource.count(),
    tx.inspirationAccount.count(),
    tx.slideshowProject.count(),
    tx.slideshowAutomation.count(),
    tx.costLog.count(),
    tx.storedAsset.count(),
  ]);
  return {
    hasMarker: marker !== null,
    contentRows: counts.reduce((total, count) => total + count, 0),
  };
}

async function clearWorkspace(tx: Prisma.TransactionClient) {
  await tx.slideshowSlide.deleteMany();
  await tx.slideshowAutomation.deleteMany();
  await tx.slideshowProject.deleteMany();
  await tx.ugcReferenceImage.deleteMany();
  await tx.avatarIdentityImage.deleteMany();
  await tx.avatarIdentityPack.deleteMany();
  await tx.avatar.deleteMany();
  await tx.tikTokSource.deleteMany();
  await tx.inspirationVideo.deleteMany();
  await tx.inspirationAccount.deleteMany();
  await tx.costLog.deleteMany();
  await tx.generatedFile.deleteMany();
  await tx.generationJob.deleteMany();
  await tx.storedAsset.deleteMany();
}

async function writeSeed(tx: Prisma.TransactionClient, seed: DemoSeed, now: Date) {
  await tx.generationJob.createMany({ data: seed.jobs });
  await tx.generatedFile.createMany({ data: seed.files });
  await tx.costLog.createMany({ data: seed.costLogs });
  await tx.avatar.createMany({ data: seed.avatars });
  await tx.avatarIdentityPack.createMany({ data: seed.identityPacks });
  await tx.avatarIdentityImage.createMany({ data: seed.identityImages });
  await tx.tikTokSource.createMany({ data: seed.sources });
  await tx.ugcReferenceImage.createMany({ data: seed.references });
  await tx.slideshowProject.createMany({ data: seed.projects });
  await tx.slideshowSlide.createMany({ data: seed.slides });
  await tx.slideshowAutomation.createMany({ data: seed.slideshowAutomations });

  const documents: Array<{ key: string; value: unknown }> = [
    ...Object.entries(seed.features).map(([feature, records]) => ({
      key: workspaceFeatureKey(feature as WorkspaceFeature),
      value: records,
    })),
    { key: DEMO_MARKER_KEY, value: { restoredAt: now.toISOString() } },
  ];
  await tx.storedAsset.createMany({
    data: documents.map(({ key, value }) => ({
      key,
      data: Uint8Array.from(Buffer.from(JSON.stringify(value, null, 2), "utf8")),
    })),
  });
}
