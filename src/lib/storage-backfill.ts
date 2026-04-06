import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

const globalForBackfill = globalThis as unknown as {
  __postforge_storage_backfill_promise?: Promise<void>;
};

export async function backfillLegacyAssets(): Promise<void> {
  if (process.env.STORAGE_DRIVER === "local") {
    return;
  }

  if (!globalForBackfill.__postforge_storage_backfill_promise) {
    globalForBackfill.__postforge_storage_backfill_promise =
      runLegacyAssetBackfill();
  }

  await globalForBackfill.__postforge_storage_backfill_promise;
}

async function runLegacyAssetBackfill(): Promise<void> {
  const [generatedFiles, avatars, sources] = await Promise.all([
    prisma.generatedFile.findMany({ select: { localPath: true } }),
    prisma.avatar.findMany({ select: { localPath: true } }),
    prisma.tikTokSource.findMany({
      select: { localPath: true, thumbnailPath: true },
    }),
  ]);

  const allPaths = [
    ...generatedFiles.map((file) => file.localPath),
    ...avatars.map((avatar) => avatar.localPath),
    ...sources.flatMap((source) =>
      source.thumbnailPath
        ? [source.localPath, source.thumbnailPath]
        : [source.localPath]
    ),
  ];

  const uniquePaths = [...new Set(allPaths.filter(Boolean))];
  if (uniquePaths.length === 0) {
    return;
  }

  const persisted = await prisma.storedAsset.findMany({
    where: { key: { in: uniquePaths } },
    select: { key: true },
  });
  const persistedKeys = new Set(persisted.map((asset) => asset.key));

  let migratedCount = 0;

  for (const localPath of uniquePaths) {
    if (persistedKeys.has(localPath)) {
      continue;
    }

    try {
      await storage.read(localPath);
      migratedCount += 1;
    } catch (err) {
      console.warn(`[storage] Failed to backfill legacy asset ${localPath}:`, err);
    }
  }

  if (migratedCount > 0) {
    console.log(`[storage] Backfilled ${migratedCount} asset(s) into Postgres storage`);
  }
}
