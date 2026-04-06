import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import { execFileAsync, FFMPEG } from "./ffmpeg";
import { storage } from "@/lib/storage";

/**
 * Extracts a single thumbnail frame from a video and saves it to durable storage.
 * Returns the storage-relative path to the thumbnail, or null on failure.
 */
export async function extractThumbnail(videoFullPath: string): Promise<string | null> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "postforge-thumb-"));

  try {
    const thumbFilename = `${randomUUID()}.jpg`;
    const thumbFullPath = path.join(tmpDir, thumbFilename);
    await execFileAsync(FFMPEG, [
      "-i", videoFullPath,
      "-vframes", "1",
      "-ss", "0.5",
      "-vf", "scale=320:-1",
      "-q:v", "4",
      "-y",
      thumbFullPath,
    ], { timeout: 15_000 });
    return await storage.saveFromFile("thumbnails", thumbFilename, thumbFullPath);
  } catch {
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
