import { execFileAsync } from "@/lib/ugc/ffmpeg";

const YT_DLP_TIMEOUT_MS = 15_000;
const MAX_CONCURRENT = 3;

/*
 * TikTok signs its cover URLs and they expire within days, and its oEmbed no longer returns a
 * thumbnail. yt-dlp reads the post page and prints a freshly signed cover. A grid asks for dozens
 * of covers at once, so only a few lookups run together and the rest wait their turn.
 */
let running = 0;
const waiting: Array<() => void> = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

export async function resolveTikTokThumbnailWithYtDlp(postUrl: string): Promise<string | null> {
  if (!/^https:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i.test(postUrl)) return null;
  return withSlot(async () => {
    try {
      const { stdout } = await execFileAsync(
        process.env.YT_DLP_PATH || "yt-dlp",
        ["--no-warnings", "--skip-download", "--print", "thumbnail", postUrl],
        { timeout: YT_DLP_TIMEOUT_MS },
      );
      const url = stdout.trim().split("\n").pop()?.trim() ?? "";
      return /^https?:\/\//i.test(url) ? url : null;
    } catch {
      return null;
    }
  });
}
