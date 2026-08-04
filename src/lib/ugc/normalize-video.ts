import * as path from "path";
import { randomUUID } from "crypto";
import { execFileAsync, FFMPEG, FFPROBE } from "./ffmpeg";

/**
 * Normalizes a video for optimal motion control extraction:
 * - Constant 30fps (TikTok videos are often VFR which causes timing drift)
 * - Trims leading idle/static frames that misalign the first-frame pose
 * - H.264 encoding for maximum compatibility
 *
 * Returns the absolute path to the normalized video (temp file).
 */
export async function normalizeVideoForMotionControl(
  videoFullPath: string
): Promise<string> {
  const dir = path.dirname(videoFullPath);
  const normalizedPath = path.join(dir, `${randomUUID()}-normalized.mp4`);

  // Detect if there's a scene change (like a cut to a different screen)
  // and get the total duration, so we can trim to just the UGC portion
  const duration = await getVideoDuration(videoFullPath);
  const sceneEnd = await detectFirstSceneChange(videoFullPath, duration);

  const args = [
    "-i", videoFullPath,
    "-r", "30",
    "-fps_mode", "cfr",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-movflags", "+faststart",
  ];

  // If a scene change is detected before the end, trim to just the first scene
  if (sceneEnd !== null && sceneEnd < duration - 0.5) {
    args.push("-t", sceneEnd.toFixed(2));
    console.log(`[normalize] Trimming to first scene: ${sceneEnd.toFixed(2)}s (full: ${duration.toFixed(2)}s)`);
  }

  // Keep audio for keep_original_sound support
  args.push("-c:a", "aac", "-y", normalizedPath);

  await execFileAsync(FFMPEG, args, { timeout: 60_000 });

  return normalizedPath;
}

async function getVideoDuration(videoFullPath: string): Promise<number> {
  const { stdout } = await execFileAsync(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    videoFullPath,
  ], { timeout: 10_000 });
  return parseFloat(stdout.trim()) || 0;
}

/**
 * Detects the timestamp of the first major scene change (cut) in the video.
 * TikTok videos often have a UGC talking portion followed by a product/app screenshot.
 * Returns null if no scene change is found.
 */
async function detectFirstSceneChange(
  videoFullPath: string,
  duration: number
): Promise<number | null> {
  // Only check if video is long enough to have a cut (>4s)
  if (duration < 4) return null;

  try {
    // ffmpeg writes filter output to stderr; -f null always "succeeds" but
    // execFile may reject if ffmpeg returns non-zero, so we catch and parse
    let output = "";
    try {
      const result = await execFileAsync(FFMPEG, [
        "-i", videoFullPath,
        "-filter:v", "select='gt(scene,0.4)',showinfo",
        "-f", "null",
        "-",
      ], { timeout: 30_000 });
      output = result.stderr || "";
    } catch (err: unknown) {
      // ffmpeg writes filter output to stderr and may exit non-zero
      output = (err as { stderr?: string }).stderr ?? "";
    }

    // showinfo outputs lines like: [Parsed_showinfo_1 ... pts_time:5.5 ...]
    const match = output.match(/pts_time:\s*([\d.]+)/);
    if (match) {
      const sceneTime = parseFloat(match[1]);
      // Only trim if the scene change is after at least 2s of content
      if (sceneTime > 2) {
        return sceneTime;
      }
    }
  } catch {
    // Ignore scene detection failures — just use full video
  }

  return null;
}
