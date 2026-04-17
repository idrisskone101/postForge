import type { TikTokSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import {
  downloadTikTok,
  fetchMetadata,
  validateTikTokUrl,
} from "@/lib/ugc/download-tiktok";

export async function ensureTikTokSource(url: string): Promise<TikTokSource> {
  validateTikTokUrl(url);

  const metadata = await fetchMetadata(url);
  const canonicalUrl = metadata.canonicalUrl;

  const existing = await prisma.tikTokSource.findUnique({
    where: { originalUrl: canonicalUrl },
  });

  if (existing) {
    const fileExists = await storage.exists(existing.localPath);
    if (fileExists) {
      return existing;
    }

    await prisma.tikTokSource.delete({ where: { id: existing.id } });
  }

  const result = await downloadTikTok(url, metadata);
  return prisma.tikTokSource.create({
    data: {
      label: result.label,
      originalUrl: result.canonicalUrl,
      localPath: result.localPath,
      filename: result.filename,
      durationSec: result.durationSec,
      width: result.width,
      height: result.height,
      fileSizeBytes: result.fileSizeBytes,
      thumbnailPath: result.thumbnailPath,
    },
  });
}
