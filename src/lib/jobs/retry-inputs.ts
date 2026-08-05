import type {
  VideoGenerationRequest,
  VideoSwapGenerationRequest,
} from "@/lib/ai/types";
import type {
  CloneGenerationRequest,
  SourceVideoSnapshot,
} from "@/lib/ugc/generate-clone";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export function asRetryString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

export function asRetryNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function asRetryBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function parseSourceVideoSnapshot(
  value: unknown
): SourceVideoSnapshot | undefined {
  const input = asRecord(value);
  if (!input) return undefined;

  const sourceId = asRetryString(input.sourceId);
  const label = asRetryString(input.label);
  const originalUrl = asRetryString(input.originalUrl);
  const localPath = asRetryString(input.localPath);
  const filename = asRetryString(input.filename);
  const durationSec = asRetryNumber(input.durationSec);
  const width = asRetryNumber(input.width);
  const height = asRetryNumber(input.height);

  if (
    !sourceId ||
    !label ||
    !originalUrl ||
    !localPath ||
    !filename ||
    durationSec === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return undefined;
  }

  return {
    sourceId,
    label,
    originalUrl,
    localPath,
    filename,
    durationSec,
    width,
    height,
  };
}

export function buildCloneRetryRequest(
  input: Record<string, unknown>,
  fallbackModel: string
): CloneGenerationRequest | null {
  const sourceVideoSnapshot = parseSourceVideoSnapshot(input.sourceVideo);
  const tiktokSourceId =
    asRetryString(input.tiktokSourceId) ?? sourceVideoSnapshot?.sourceId;
  const tiktokVideoPath =
    sourceVideoSnapshot?.localPath ?? asRetryString(input.tiktokVideoPath);
  const avatarId = asRetryString(input.avatarId);
  const referenceImageFileId = asRetryString(input.referenceImageFileId);
  const collectionAssetId = asRetryString(input.collectionAssetId);
  const savedReferenceId = asRetryString(input.savedReferenceId);
  const referenceCount = [
    referenceImageFileId,
    collectionAssetId,
    savedReferenceId,
  ].filter(Boolean).length;

  if (!tiktokSourceId || !tiktokVideoPath || !avatarId || referenceCount > 1) {
    return null;
  }

  return {
    tiktokSourceId,
    tiktokVideoPath,
    avatarId,
    prompt: asRetryString(input.prompt),
    keepOriginalSound: asRetryBoolean(input.keepOriginalSound),
    modelId: asRetryString(input.modelId) ?? fallbackModel,
    referenceImageFileId,
    collectionAssetId,
    savedReferenceId,
    durationSec: asRetryNumber(input.durationSec),
    removeTextOverlays: input.removeTextOverlays === true,
    sourceVideoSnapshot,
  };
}

const SWAP_MODES = new Set(["person", "object", "background"]);
const SWAP_RESOLUTIONS = new Set(["360p", "540p", "720p"]);

export function buildSwapRetryRequest(
  input: Record<string, unknown>,
  fallbackModel: string
): VideoSwapGenerationRequest | null {
  const model = asRetryString(input.model) ?? fallbackModel;
  const swapVideoId = asRetryString(input.swapVideoId);
  const swapReferenceId = asRetryString(input.swapReferenceId);
  const referenceFileId = asRetryString(input.referenceFileId);
  const swapMode = asRetryString(input.swapMode);
  const keyframeId = asRetryNumber(input.keyframeId);
  const resolution = asRetryString(input.resolution);
  const keepOriginalSound = asRetryBoolean(input.keepOriginalSound);

  if (!swapVideoId) return null;
  if (swapReferenceId && referenceFileId) return null;

  return {
    prompt: asRetryString(input.prompt) ?? "",
    model,
    videoUrl: swapVideoId,
    referenceImageUrl: swapReferenceId ?? referenceFileId ?? undefined,
    swapMode: swapMode && SWAP_MODES.has(swapMode) ? (swapMode as "person" | "object" | "background") : undefined,
    keyframeId: keyframeId !== undefined ? Math.max(1, Math.round(keyframeId)) : undefined,
    resolution:
      resolution && SWAP_RESOLUTIONS.has(resolution)
        ? (resolution as "360p" | "540p" | "720p")
        : undefined,
    keepOriginalSound: keepOriginalSound ?? undefined,
  };
}

export function parseRetryMultiShot(
  value: unknown
): VideoGenerationRequest["multiShot"] {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.shots) || record.shots.length === 0) {
    return undefined;
  }

  const shots = record.shots.map((candidate) => {
    const shot = asRecord(candidate);
    const prompt = asRetryString(shot?.prompt);
    const duration = asRetryNumber(shot?.duration);
    const cameraMovement = asRetryString(shot?.cameraMovement);
    if (!prompt || duration === undefined || duration <= 0) return null;
    return { prompt, duration, cameraMovement };
  });

  return shots.every(
    (shot): shot is NonNullable<typeof shot> => shot !== null
  )
    ? { shots }
    : undefined;
}

export function parsePersistedHttpUrls(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 14) return [];

  const urls: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") return [];
    try {
      const url = new URL(candidate);
      if (url.protocol !== "http:" && url.protocol !== "https:") return [];
      urls.push(url.toString());
    } catch {
      return [];
    }
  }
  return urls;
}
