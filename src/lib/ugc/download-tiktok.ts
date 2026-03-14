import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";

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
}

interface TikTokMetadata {
  duration: number;
  width: number;
  height: number;
}

export function validateTikTokUrl(url: string): void {
  if (!TIKTOK_URL_PATTERN.test(url)) {
    throw new Error("Invalid TikTok URL. Must be a tiktok.com, vm.tiktok.com, or vt.tiktok.com link.");
  }
}

async function fetchMetadata(url: string): Promise<TikTokMetadata> {
  const { stdout } = await execFileAsync("yt-dlp", ["--dump-json", "--no-warnings", url], {
    timeout: 30_000,
  });

  const data = JSON.parse(stdout);
  return {
    duration: data.duration ?? 0,
    width: data.width ?? 0,
    height: data.height ?? 0,
  };
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

  return {
    localPath,
    filename,
    durationSec: metadata.duration,
    width: metadata.width,
    height: metadata.height,
  };
}
