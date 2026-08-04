import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { execFileAsync } from "./ffmpeg";
import { storage } from "@/lib/storage";
import { extractThumbnail } from "./thumbnail";

const TIKTOK_URL_PATTERN = /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//;
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
  const match = url.match(/@([^/]+)/);
  if (match) return `@${match[1]}`;
  return `TikTok ${metadata.videoId || "video"}`;
}

export async function downloadTikTok(
  url: string,
  existingMetadata?: TikTokMetadata
): Promise<TikTokDownloadResult> {
  validateTikTokUrl(url);

  const metadata = existingMetadata ?? await fetchMetadata(url);

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "postforge-tiktok-"));
  const id = randomUUID();
  const filename = `${id}.mp4`;
  const fullPath = path.join(tmpDir, filename);

  try {
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

    const localPath = await storage.saveFromFile("tiktok-sources", filename, fullPath);

    let fileSizeBytes: number | null = null;
    try {
      const stat = await fs.stat(fullPath);
      fileSizeBytes = stat.size;
    } catch {
      // ignore
    }

    const thumbnailPath = await extractThumbnail(fullPath);
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
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
