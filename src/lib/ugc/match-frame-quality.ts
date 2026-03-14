import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(execFile);

interface ColorStats {
  r: number;
  g: number;
  b: number;
  brightness: number;
}

/**
 * Get average color by scaling image to 1x1 pixel with FFmpeg.
 * Returns the mean R, G, B, and perceptual brightness.
 */
async function getColorStats(imagePath: string): Promise<ColorStats> {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rawPath = path.join(os.tmpdir(), `pf-stats-${uid}.raw`);
  try {
    await execAsync("ffmpeg", [
      "-i", imagePath,
      "-vf", "scale=1:1:flags=area",
      "-pix_fmt", "rgb24",
      "-f", "rawvideo",
      "-v", "quiet",
      "-y", rawPath,
    ]);
    const data = await fs.readFile(rawPath);
    if (data.length < 3) throw new Error("Failed to read color stats");
    const r = data[0], g = data[1], b = data[2];
    return { r, g, b, brightness: 0.299 * r + 0.587 * g + 0.114 * b };
  } finally {
    await fs.unlink(rawPath).catch(() => {});
  }
}

/**
 * Post-process a generated reference image to match the TikTok frame's
 * color, brightness, and quality characteristics using FFmpeg.
 *
 * This lets the AI image generator focus purely on avatar identity while
 * FFmpeg deterministically handles the quality/aesthetic matching.
 */
export async function matchFrameQuality(
  generatedBuffer: Buffer,
  tiktokFramePath: string,
): Promise<Buffer> {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputPath = path.join(os.tmpdir(), `pf-gen-${uid}.png`);
  const outputPath = path.join(os.tmpdir(), `pf-matched-${uid}.jpg`);

  await fs.writeFile(inputPath, generatedBuffer);

  try {
    const [genStats, frameStats] = await Promise.all([
      getColorStats(inputPath),
      getColorStats(tiktokFramePath),
    ]);

    // Brightness adjustment (eq filter: -1.0 to 1.0, additive)
    const brightDelta = (frameStats.brightness - genStats.brightness) / 255;

    // Saturation ratio — match the frame's color intensity
    const genChroma = Math.sqrt(
      (genStats.r - genStats.brightness) ** 2 +
      (genStats.g - genStats.brightness) ** 2 +
      (genStats.b - genStats.brightness) ** 2
    );
    const frameChroma = Math.sqrt(
      (frameStats.r - frameStats.brightness) ** 2 +
      (frameStats.g - frameStats.brightness) ** 2 +
      (frameStats.b - frameStats.brightness) ** 2
    );
    const satRatio = genChroma > 1
      ? Math.min(2, Math.max(0.3, frameChroma / genChroma))
      : 1;

    // Color temperature — compare R/B ratio to detect warm/cool shift
    const genWarmth = genStats.r / Math.max(1, genStats.b);
    const frameWarmth = frameStats.r / Math.max(1, frameStats.b);
    const warmthShift = Math.max(-0.3, Math.min(0.3,
      (frameWarmth - genWarmth) * 0.12
    ));

    // Build FFmpeg filter chain
    const filterParts = [
      `eq=brightness=${brightDelta.toFixed(3)}:saturation=${satRatio.toFixed(2)}`,
    ];
    if (Math.abs(warmthShift) > 0.01) {
      filterParts.push(
        `colorbalance=rs=${warmthShift.toFixed(2)}:bs=${(-warmthShift).toFixed(2)}`
      );
    }
    // Slight softness — removes the AI-generated crispness
    filterParts.push("gblur=sigma=0.5");

    await execAsync("ffmpeg", [
      "-i", inputPath,
      "-vf", filterParts.join(","),
      "-q:v", "90",
      "-v", "quiet",
      "-y", outputPath,
    ]);

    return await fs.readFile(outputPath);
  } finally {
    await fs.unlink(inputPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
