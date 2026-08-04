import path from "node:path";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { execFileAsync, FFPROBE } from "@/lib/ugc/ffmpeg";

const INSTAGRAM_MIN_FRAME_RATE = 23;
const INSTAGRAM_MAX_FRAME_RATE = 60;
const INSTAGRAM_MAX_VIDEO_BITRATE = 25_000_000;
const INSTAGRAM_MAX_AUDIO_SAMPLE_RATE = 48_000;
const INSTAGRAM_MAX_AUDIO_BITRATE = 128_000;

type ProbeStream = {
  codec_type?: unknown;
  codec_name?: unknown;
  avg_frame_rate?: unknown;
  bit_rate?: unknown;
  sample_rate?: unknown;
};

type ProbeDocument = {
  streams?: unknown;
};

export class InstagramMediaProbeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramMediaProbeError";
  }
}

function positiveNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function frameRate(value: unknown) {
  if (typeof value !== "string") return null;
  const [numeratorText, denominatorText, extra] = value.split("/");
  if (extra !== undefined) return null;
  const numerator = Number(numeratorText);
  const denominator = denominatorText === undefined ? 1 : Number(denominatorText);
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator <= 0 ||
    denominator <= 0
  ) {
    return null;
  }
  return numerator / denominator;
}

function streamsFromProbe(value: unknown): ProbeStream[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const streams = (value as ProbeDocument).streams;
  return Array.isArray(streams)
    ? streams.filter(
        (stream): stream is ProbeStream =>
          Boolean(stream && typeof stream === "object" && !Array.isArray(stream))
      )
    : [];
}

/** Validate the actual encoded streams, not database or browser metadata. */
export function assertInstagramMediaProbe(value: unknown) {
  const streams = streamsFromProbe(value);
  const video = streams.find((stream) => stream.codec_type === "video");
  if (!video) {
    throw new InstagramMediaProbeError(
      "Instagram could not find a video stream in this asset; regenerate or export it as an MP4"
    );
  }

  const videoCodec =
    typeof video.codec_name === "string" ? video.codec_name.toLowerCase() : "";
  if (videoCodec !== "h264" && videoCodec !== "hevc") {
    throw new InstagramMediaProbeError(
      "Instagram Reels require H.264 or HEVC video; regenerate or export this asset with a supported video codec"
    );
  }

  const fps = frameRate(video.avg_frame_rate);
  if (
    fps === null ||
    fps < INSTAGRAM_MIN_FRAME_RATE ||
    fps > INSTAGRAM_MAX_FRAME_RATE
  ) {
    throw new InstagramMediaProbeError(
      "Instagram Reels require a frame rate between 23 and 60 fps; regenerate or export this asset at a supported frame rate"
    );
  }

  const videoBitrate = positiveNumber(video.bit_rate);
  if (videoBitrate === null || videoBitrate > INSTAGRAM_MAX_VIDEO_BITRATE) {
    throw new InstagramMediaProbeError(
      "Instagram Reels require a readable video bitrate no higher than 25 Mbps; regenerate or export this asset at a supported bitrate"
    );
  }

  for (const audio of streams.filter(
    (stream) => stream.codec_type === "audio"
  )) {
    const audioCodec =
      typeof audio.codec_name === "string"
        ? audio.codec_name.toLowerCase()
        : "";
    if (audioCodec !== "aac") {
      throw new InstagramMediaProbeError(
        "Instagram Reels audio must use AAC; regenerate or export this asset with AAC audio"
      );
    }
    const sampleRate = positiveNumber(audio.sample_rate);
    if (sampleRate !== INSTAGRAM_MAX_AUDIO_SAMPLE_RATE) {
      throw new InstagramMediaProbeError(
        "Instagram Reels audio must use a 48 kHz sample rate; regenerate or export this asset with supported audio"
      );
    }
    const audioBitrate = positiveNumber(audio.bit_rate);
    if (
      audioBitrate === null ||
      audioBitrate > INSTAGRAM_MAX_AUDIO_BITRATE
    ) {
      throw new InstagramMediaProbeError(
        "Instagram Reels audio must have a readable bitrate no higher than 128 kbps; regenerate or export this asset with supported audio"
      );
    }
  }
}

export type InstagramProbeRunner = (
  executable: string,
  args: string[],
  options: { timeout: number; maxBuffer: number }
) => Promise<string>;

export function instagramMediaProbeExecutable(
  env: Record<string, string | undefined> = process.env
) {
  return env.FFPROBE_PATH?.trim() || FFPROBE;
}

export async function instagramMediaProbeIsAvailable(
  executable = instagramMediaProbeExecutable()
) {
  if (!path.isAbsolute(executable) || executable.includes("\0")) return false;
  try {
    await access(executable, fsConstants.X_OK);
    const result = await execFileAsync(executable, ["-version"], {
      encoding: "utf8",
      timeout: 3_000,
      maxBuffer: 64 * 1024,
    });
    return /^ffprobe version\b/im.test(
      `${String(result.stdout)}\n${String(result.stderr)}`
    );
  } catch {
    return false;
  }
}

async function runInstagramProbe(
  executable: string,
  args: string[],
  options: { timeout: number; maxBuffer: number }
) {
  const result = await execFileAsync(executable, args, {
    ...options,
    encoding: "utf8",
  });
  return String(result.stdout);
}

export async function inspectInstagramReelMedia(
  localPath: string,
  input: {
    executable?: string;
    run?: InstagramProbeRunner;
  } = {}
) {
  if (!path.isAbsolute(localPath) || localPath.includes("\0")) {
    throw new InstagramMediaProbeError(
      "PostForge could not safely inspect this Instagram video; regenerate the approved asset"
    );
  }
  const executable = input.executable ?? instagramMediaProbeExecutable();
  const run = input.run ?? runInstagramProbe;
  let stdout: string;
  try {
    stdout = await run(
      executable,
      [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_entries",
        "stream=codec_type,codec_name,avg_frame_rate,bit_rate,sample_rate",
        localPath,
      ],
      { timeout: 15_000, maxBuffer: 1024 * 1024 }
    );
  } catch {
    throw new InstagramMediaProbeError(
      "PostForge could not inspect the Instagram video encoding; verify FFPROBE_PATH or regenerate the approved asset"
    );
  }

  let probe: unknown;
  try {
    probe = JSON.parse(stdout);
  } catch {
    throw new InstagramMediaProbeError(
      "PostForge could not read the Instagram video encoding; regenerate the approved asset"
    );
  }
  assertInstagramMediaProbe(probe);
}
