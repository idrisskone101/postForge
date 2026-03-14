import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import * as os from "os";
import { execFileAsync, FFMPEG } from "./ffmpeg";

/**
 * Extracts the very first frame (frame 0) from a video to use as a scene
 * reference for Gemini analysis. Saves as a high-quality JPEG.
 *
 * Returns the absolute path to the extracted frame.
 */
export async function extractReferenceFrame(
  videoFullPath: string
): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "postforge-frame-"));
  const framePath = path.join(tmpDir, `scene-${randomUUID()}.jpg`);

  await execFileAsync(FFMPEG, [
    "-i", videoFullPath,
    "-frames:v", "1",
    "-q:v", "2",
    "-y",
    framePath,
  ], { timeout: 15_000 });

  return framePath;
}
