import { prisma } from "@/lib/db";
import { storage, isStoragePathUnder } from "@/lib/storage";
import { uploadToFalStorage } from "@/lib/ai/fal-client";

const TRUSTED_VIDEO_PREFIXES = ["tiktok-sources", "ugc-clone-sources"];

export type StoredSwapAsset = {
  id: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  localPath: string;
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
};

export async function loadSwapAsset(
  assetId: string
): Promise<StoredSwapAsset | null> {
  const stored = await prisma.storedAsset.findUnique({
    where: { key: `swap-assets/${assetId}.json` },
    select: { data: true },
  });
  if (!stored?.data) return null;
  try {
    return JSON.parse(
      Buffer.from(stored.data).toString("utf8")
    ) as StoredSwapAsset;
  } catch {
    return null;
  }
}

/**
 * Resolve a persisted source video id into a provider-ready fal URL. Uploaded
 * swap assets are stored as StoredAsset JSON records; TikTok source paths are
 * trusted when they live under the source-video storage prefixes. Provider
 * URLs are transient execution details, never persisted inputs.
 */
export async function resolveSwapSourceVideoUrl(
  swapVideoId: string
): Promise<{ url: string; durationSec: number | null; filename: string } | null> {
  const videoAsset = await loadSwapAsset(swapVideoId);
  if (videoAsset) {
    const fullPath = await storage.ensureLocalFile(videoAsset.localPath);
    return {
      url: await uploadToFalStorage(fullPath),
      durationSec: videoAsset.durationSec ?? null,
      filename: videoAsset.filename,
    };
  }

  const tiktokSource = await prisma.tikTokSource.findUnique({
    where: { id: swapVideoId },
  });
  const sourcePath = tiktokSource?.localPath ?? null;
  if (
    tiktokSource &&
    sourcePath &&
    isStoragePathUnder(sourcePath, TRUSTED_VIDEO_PREFIXES)
  ) {
    const fullPath = await storage.ensureLocalFile(sourcePath);
    return {
      url: await uploadToFalStorage(fullPath),
      durationSec: tiktokSource.durationSec ?? null,
      filename: tiktokSource.filename,
    };
  }

  return null;
}

/**
 * Resolve a persisted reference id into a provider-ready fal URL. Either an
 * uploaded swap reference (StoredAsset) or a server-owned generated file
 * (Clone reference-image handoff).
 */
export async function resolveSwapReferenceUrl(
  referenceId: string
): Promise<string | null> {
  const referenceAsset = await loadSwapAsset(referenceId);
  if (referenceAsset) {
    const fullPath = await storage.ensureLocalFile(referenceAsset.localPath);
    return uploadToFalStorage(fullPath);
  }

  const refFile = await prisma.generatedFile.findUnique({
    where: { id: referenceId },
    select: { localPath: true },
  });
  if (!refFile) return null;
  return uploadToFalStorage(await storage.ensureLocalFile(refFile.localPath));
}
