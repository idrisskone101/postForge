import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import { execFileAsync, FFMPEG } from "./ffmpeg";
import { storage } from "@/lib/storage";
import { extractThumbnailToDisk } from "./thumbnail";

const TIKTOK_URL_PATTERN = /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//;
const MAX_DURATION_SEC = 30;
const MAX_FILE_SIZE = "100M";

export interface TikTokDownloadResult {
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
  fileSizeBytes: number | null;
  thumbnailPath: string | null;
  label: string;
  canonicalUrl: string;
}

export interface TikTokMetadata {
  duration: number;
  width: number;
  height: number;
  canonicalUrl: string;
  uploader: string | null;
  videoId: string | null;
}

export function validateTikTokUrl(url: string): void {
  if (!TIKTOK_URL_PATTERN.test(url)) {
    throw new Error("Invalid TikTok URL. Must be a tiktok.com, vm.tiktok.com, or vt.tiktok.com link.");
  }
}

export async function fetchMetadata(url: string): Promise<TikTokMetadata> {
  const { stdout } = await execFileAsync("yt-dlp", ["--dump-json", "--no-warnings", url], {
    timeout: 30_000,
  });

  const data = JSON.parse(stdout);
  return {
    duration: data.duration ?? 0,
    width: data.width ?? 0,
    height: data.height ?? 0,
    canonicalUrl: data.webpage_url || url,
    uploader: data.uploader || data.channel || null,
    videoId: data.id || null,
  };
}

export function extractLabel(metadata: TikTokMetadata, url: string): string {
  if (metadata.uploader) {
    const name = metadata.uploader.startsWith("@") ? metadata.uploader : `@${metadata.uploader}`;
    return metadata.videoId ? `${name} - ${metadata.videoId}` : name;
  }
  // Fallback: parse URL for @username
  const match = url.match(/@([^/]+)/);
  if (match) return `@${match[1]}`;
  return `TikTok ${metadata.videoId || "video"}`;
}


export async function downloadTikTok(url: string, existingMetadata?: TikTokMetadata): Promise<TikTokDownloadResult> {
  validateTikTokUrl(url);

  // Get metadata first (skip if already provided)
  const metadata = existingMetadata ?? await fetchMetadata(url);

  if (metadata.duration > MAX_DURATION_SEC) {
    throw new Error(
      `Video is ${metadata.duration}s long, which exceeds the ${MAX_DURATION_SEC}s limit for motion control.`
    );
  }

  // Prepare output path
  const today = new Date().toISOString().split("T")[0];
  const dir = path.resolve(storage.getFullPath("tiktok-sources"), today);
  await fs.mkdir(dir, { recursive: true });

  const id = randomUUID();
  const filename = `${id}.mp4`;
  const fullPath = path.join(dir, filename);

  // Download
  await execFileAsync(
    "yt-dlp",
    [
      "-f", "best[ext=mp4]",
      "--no-playlist",
      "--max-filesize", MAX_FILE_SIZE,
      "-o", fullPath,
      url,
    ],
    { timeout: 120_000 }
  );

  const localPath = path.join("tiktok-sources", today, filename);

  // Get file size
  let fileSizeBytes: number | null = null;
  try {
    const stat = await fs.stat(fullPath);
    fileSizeBytes = stat.size;
  } catch {
    // ignore
  }

  // Extract thumbnail
  const thumbnailPath = await extractThumbnailToDisk(fullPath, dir);

  const label = extractLabel(metadata, url);

  return {
    localPath,
    filename,
    durationSec: metadata.duration,
    width: metadata.width,
    height: metadata.height,
    fileSizeBytes,
    thumbnailPath,
    label,
    canonicalUrl: metadata.canonicalUrl,
  };
}
