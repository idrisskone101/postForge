import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import { execFileAsync as ffmpegExec, FFMPEG } from "./ffmpeg";

const execFileAsync = promisify(execFile);

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

interface TikTokMetadata {
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

async function extractThumbnail(
  videoFullPath: string,
  outputDir: string
): Promise<string | null> {
  try {
    const thumbFilename = `${randomUUID()}.jpg`;
    const thumbFullPath = path.join(outputDir, thumbFilename);
    await ffmpegExec(FFMPEG, [
      "-i", videoFullPath,
      "-vframes", "1",
      "-ss", "0.5",
      "-vf", "scale=320:-1",
      "-q:v", "4",
      "-y",
      thumbFullPath,
    ], { timeout: 15_000 });
    // Return path relative to storage base
    const basePath = process.env.STORAGE_LOCAL_PATH || "./data/outputs";
    return path.relative(path.resolve(basePath), thumbFullPath);
  } catch {
    return null;
  }
}

export async function downloadTikTok(url: string): Promise<TikTokDownloadResult> {
  validateTikTokUrl(url);

  // Get metadata first
  const metadata = await fetchMetadata(url);

  if (metadata.duration > MAX_DURATION_SEC) {
    throw new Error(
      `Video is ${metadata.duration}s long, which exceeds the ${MAX_DURATION_SEC}s limit for motion control.`
    );
  }

  // Prepare output path
  const today = new Date().toISOString().split("T")[0];
  const basePath = process.env.STORAGE_LOCAL_PATH || "./data/outputs";
  const dir = path.resolve(basePath, "tiktok-sources", today);
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
  const thumbnailPath = await extractThumbnail(fullPath, dir);

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
