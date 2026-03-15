import * as path from "path";
import { randomUUID } from "crypto";
import { execFileAsync, FFMPEG } from "./ffmpeg";
import { storage } from "@/lib/storage";

/**
 * Extracts a single thumbnail frame from a video and saves it to disk as a JPEG.
 * Returns the storage-relative path to the thumbnail, or null on failure.
 */
export async function extractThumbnailToDisk(
  videoFullPath: string,
  outputDir: string
): Promise<string | null> {
  try {
    const thumbFilename = `${randomUUID()}.jpg`;
    const thumbFullPath = path.join(outputDir, thumbFilename);
    await execFileAsync(FFMPEG, [
      "-i", videoFullPath,
      "-vframes", "1",
      "-ss", "0.5",
      "-vf", "scale=320:-1",
      "-q:v", "4",
      "-y",
      thumbFullPath,
    ], { timeout: 15_000 });
    return storage.getRelativePath(thumbFullPath);
  } catch {
    return null;
  }
}
