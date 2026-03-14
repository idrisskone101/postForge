import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import * as os from "os";
import { execFileAsync, FFMPEG, FFPROBE } from "./ffmpeg";
import { storage } from "@/lib/storage";

export interface TrimResult {
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
}

async function probeDuration(fullPath: string): Promise<number> {
  const { stdout } = await execFileAsync(FFPROBE, [
    "-v", "quiet",
    "-print_format", "json",
    "-show_format",
    fullPath,
  ], { timeout: 15_000 });

  const data = JSON.parse(stdout);
  return parseFloat(data.format?.duration ?? "0");
}

async function probeVideoInfo(fullPath: string): Promise<{ width: number; height: number }> {
  const { stdout } = await execFileAsync(FFPROBE, [
    "-v", "quiet",
    "-print_format", "json",
    "-show_streams",
    "-select_streams", "v:0",
    fullPath,
  ], { timeout: 15_000 });

  const data = JSON.parse(stdout);
  const stream = data.streams?.[0];
  return {
    width: stream?.width ?? 0,
    height: stream?.height ?? 0,
  };
}

export async function trimVideo(
  localPath: string,
  startTime: number,
  endTime: number
): Promise<TrimResult> {
  const inputFull = storage.getFullPath(localPath);

  // Output in same directory
  const dir = path.dirname(inputFull);
  const id = randomUUID();
  const filename = `trimmed-${id}.mp4`;
  const outputFull = path.join(dir, filename);

  // Re-encode for frame-accurate trimming.
  // Using -ss before -i for fast input seeking, then -t for duration.
  // Stream copy (-c copy) only cuts at keyframes, which causes the trimmed
  // video to start at the wrong point — breaking reference frame extraction.
  await execFileAsync(FFMPEG, [
    "-ss", String(startTime),
    "-i", inputFull,
    "-t", String(endTime - startTime),
    "-c:v", "libx264", "-preset", "fast", "-crf", "18",
    "-c:a", "aac", "-b:a", "128k",
    "-avoid_negative_ts", "make_zero",
    "-y",
    outputFull,
  ], { timeout: 120_000 });

  // Get actual duration and dimensions from trimmed file
  const [durationSec, { width, height }] = await Promise.all([
    probeDuration(outputFull),
    probeVideoInfo(outputFull),
  ]);

  // Build relative localPath matching storage convention
  const newLocalPath = path.relative(storage.getFullPath(""), outputFull);

  return { localPath: newLocalPath, filename, durationSec, width, height };
}

export async function generateThumbnails(
  localPath: string,
  count: number
): Promise<string[]> {
  const inputFull = storage.getFullPath(localPath);

  const duration = await probeDuration(inputFull);
  if (duration <= 0 || count <= 0) return [];

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "postforge-thumbs-"));

  try {
    // Extract frames at evenly-spaced timestamps
    const timestamps: number[] = [];
    for (let i = 0; i < count; i++) {
      timestamps.push((duration * i) / count);
    }

    // Use a single ffmpeg call with select filter for all frames
    // For simplicity and reliability, extract one frame per call in parallel
    const tasks = timestamps.map(async (ts, i) => {
      const outFile = path.join(tmpDir, `thumb_${i}.jpg`);
      await execFileAsync(FFMPEG, [
        "-ss", String(ts),
        "-i", inputFull,
        "-frames:v", "1",
        "-vf", "scale=120:-1",
        "-q:v", "8",
        "-y",
        outFile,
      ], { timeout: 10_000 });
      return outFile;
    });

    const files = await Promise.all(tasks);

    // Read files and convert to base64 data URIs
    const thumbnails = await Promise.all(
      files.map(async (file) => {
        const buf = await fs.readFile(file);
        return `data:image/jpeg;base64,${buf.toString("base64")}`;
      })
    );

    return thumbnails;
  } finally {
    // Cleanup temp dir
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
