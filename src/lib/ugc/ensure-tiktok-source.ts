import type { TikTokSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import {
  downloadTikTok,
  fetchMetadata,
  validateTikTokUrl,
} from "@/lib/ugc/download-tiktok";

function extractTikTokVideoId(url: string): string | null {
  return url.match(/\/video\/(\d+)/)?.[1] ?? null;
}

async function findUsableExistingSource(url: string): Promise<TikTokSource | null> {
  const videoId = extractTikTokVideoId(url);
  const candidates = await prisma.tikTokSource.findMany({
    where: {
      OR: [
        { originalUrl: url },
        ...(videoId ? [{ originalUrl: { contains: videoId } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  for (const source of candidates) {
    const fileExists = await storage.exists(source.localPath);
    if (fileExists) {
      return source;
    }

    await prisma.tikTokSource.delete({ where: { id: source.id } });
  }

  return null;
}

export async function ensureTikTokSource(url: string): Promise<TikTokSource> {
  validateTikTokUrl(url);

  const existingByKnownUrl = await findUsableExistingSource(url);
  if (existingByKnownUrl) {
    return existingByKnownUrl;
  }

  const metadata = await fetchMetadata(url);
  const canonicalUrl = metadata.canonicalUrl;

  if (canonicalUrl !== url) {
    const existingByCanonicalUrl = await findUsableExistingSource(canonicalUrl);
    if (existingByCanonicalUrl) {
      return existingByCanonicalUrl;
    }
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
