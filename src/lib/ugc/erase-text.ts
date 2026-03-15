import { fal } from "@fal-ai/client";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import { uploadToFalStorage } from "@/lib/ai/fal-client";
import { storage } from "@/lib/storage";
import { execFileAsync as ffmpegExec, FFMPEG } from "./ffmpeg";

import { BRIA_ERASER_COST_PER_SEC } from "@/lib/ai/models";

const BRIA_ERASER_ENDPOINT = "bria/video/erase/prompt";

interface EraseTextResult {
  /** Relative path to the cleaned video (storage-relative) */
  cleanedPath: string;
  /** Duration in seconds that was processed */
  durationSec: number;
  /** Estimated cost in USD */
  cost: number;
}

/**
 * Removes text overlays from a video using Bria Video Eraser on fal.ai.
 *
 * This is a synchronous (subscribe) call — it blocks until the cleaned video
 * is ready, then downloads it to local storage alongside the original.
 *
 * @param videoRelativePath Storage-relative path to the source video (e.g. "tiktok-sources/2025-03-15/abc.mp4")
 * @param durationSec Duration of the video in seconds (for cost calculation)
 * @returns The cleaned video's storage-relative path
 */
export async function eraseTextFromVideo(
  videoRelativePath: string,
  durationSec: number
): Promise<EraseTextResult> {
  const videoFullPath = storage.getFullPath(videoRelativePath);

  // Re-encode to constant 30fps — TikTok videos are often VFR (variable frame rate)
  // which Bria rejects with "Video fps is out of allowed range: [20 - 30]"
  const dir = path.dirname(videoFullPath);
  const cfrFilename = `${randomUUID()}-cfr.mp4`;
  const cfrFullPath = path.join(dir, cfrFilename);
  console.log("[erase-text] Re-encoding to constant 25fps for Bria compatibility...");
  await ffmpegExec(FFMPEG, [
    "-i", videoFullPath,
    "-r", "25",
    "-fps_mode", "cfr",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-movflags", "+faststart",
    "-y",
    cfrFullPath,
  ], { timeout: 30_000 });

  // Upload CFR video to fal storage
  const videoUrl = await uploadToFalStorage(cfrFullPath);

  // Clean up the temp CFR file
  fs.unlink(cfrFullPath).catch((err) => {
    console.warn(`[erase-text] Failed to cleanup CFR temp file: ${cfrFullPath}`, err);
  });

  // Try multiple prompts — TikTok text overlays (bold hooks, effects, shadows)
  // often fail detection with generic "text". Try increasingly specific prompts.
  const PROMPTS_TO_TRY = ["text overlay", "text", "caption", "subtitle", "watermark", "letters", "words"];

  let result;
  let usedPrompt: string | null = null;

  for (const prompt of PROMPTS_TO_TRY) {
    try {
      console.log(`[erase-text] Trying prompt: "${prompt}"...`);
      result = await fal.subscribe(BRIA_ERASER_ENDPOINT, {
        input: {
          video_url: videoUrl,
          prompt,
        },
        logs: true,
      });
      usedPrompt = prompt;
      console.log(`[erase-text] Success with prompt: "${prompt}"`);
      break;
    } catch (err: unknown) {
      const falErr = err as { status?: number; body?: { detail?: string } };
      const detail = falErr.body?.detail ?? "";
      const isRetriable =
        falErr.status === 422 &&
        (detail.includes("No objects detected") || detail.includes("fps is out of allowed range"));
      if (isRetriable) {
        console.log(`[erase-text] Prompt "${prompt}" failed (${detail}), trying next...`);
        continue;
      }
      // Non-retriable error — log and throw
      if (falErr.body) {
        console.error("[erase-text] fal.ai error body:", JSON.stringify(falErr.body, null, 2));
      }
      throw err;
    }
  }

  if (!result || !usedPrompt) {
    console.log("[erase-text] No text detected with any prompt — skipping erasure, using original");
    return { cleanedPath: videoRelativePath, durationSec, cost: 0 };
  }

  // Extract the output video URL
  const output = result.data as { video?: { url: string } };
  const cleanedVideoUrl = output?.video?.url;
  if (!cleanedVideoUrl) {
    throw new Error("Bria Video Eraser did not return a video URL");
  }

  // Download cleaned video to local storage (same directory as original, with -clean suffix)
  const outDir = path.dirname(videoFullPath);
  const cleanedFilename = `${randomUUID()}-clean.mp4`;
  const cleanedFullPath = path.join(outDir, cleanedFilename);

  const response = await fetch(cleanedVideoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download cleaned video: ${response.status}`);
  }
  if (!response.body) {
    throw new Error("Response body is null");
  }
  const { createWriteStream } = await import("fs");
  const { Readable } = await import("stream");
  const { pipeline } = await import("stream/promises");
  await pipeline(
    Readable.fromWeb(response.body as import("stream/web").ReadableStream),
    createWriteStream(cleanedFullPath)
  );

  // Build storage-relative path
  const cleanedPath = storage.getRelativePath(cleanedFullPath);

  const cost = BRIA_ERASER_COST_PER_SEC * durationSec;

  return { cleanedPath, durationSec, cost };
}
