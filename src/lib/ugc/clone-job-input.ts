export const UGC_CLONE_TAG = "ugc-clone";
export const PROCESS_LOCK_MS = 30 * 60 * 1000;
export const SOURCE_VIDEO_PATH_PREFIXES = ["tiktok-sources", "ugc-clone-sources"];

export interface CloneGenerationRequest {
  tiktokSourceId: string;
  tiktokVideoPath: string;
  avatarId: string;
  prompt?: string;
  keepOriginalSound?: boolean;
  modelId?: string;
  referenceImageFileId?: string;
  collectionAssetId?: string;
  savedReferenceId?: string;
  durationSec?: number;
  removeTextOverlays?: boolean;
  sourceVideoSnapshot?: SourceVideoSnapshot;
}

export interface SourceVideoSnapshot {
  sourceId: string;
  label: string;
  originalUrl: string;
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
}

export type CloneJobInput = CloneGenerationRequest & {
  modelId: string;
  sourceVideo?: SourceVideoSnapshot;
  sceneImageUrl?: string;
  videoUrl?: string;
  identityPackId?: string | null;
  identityElementImageUrls?: string[];
  usedKlingElementBinding?: boolean;
  textErasureCost?: number;
};

export class InvalidCloneRequestError extends Error {}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function parseSourceVideoSnapshot(
  value: unknown
): SourceVideoSnapshot | undefined {
  const input = asRecord(value);
  if (!input) return undefined;

  const sourceId = asString(input.sourceId);
  const label = asString(input.label);
  const originalUrl = asString(input.originalUrl);
  const localPath = asString(input.localPath);
  const filename = asString(input.filename);
  const durationSec = asNumber(input.durationSec);
  const width = asNumber(input.width);
  const height = asNumber(input.height);

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

export function parseCloneJobInput(
  inputValue: unknown,
  fallbackModelId: string
): CloneJobInput | null {
  const input = asRecord(inputValue);
  if (!input) return null;

  const sourceVideo = parseSourceVideoSnapshot(input.sourceVideo);
  const sourceVideoSnapshot =
    parseSourceVideoSnapshot(input.sourceVideoSnapshot) ?? sourceVideo;
  const tiktokSourceId = asString(input.tiktokSourceId) ?? sourceVideoSnapshot?.sourceId;
  const tiktokVideoPath = asString(input.tiktokVideoPath) ?? sourceVideoSnapshot?.localPath;
  const avatarId = asString(input.avatarId);

  if (!tiktokSourceId || !tiktokVideoPath || !avatarId) {
    return null;
  }

  return {
    tiktokSourceId,
    tiktokVideoPath,
    avatarId,
    prompt: asString(input.prompt),
    keepOriginalSound: asBoolean(input.keepOriginalSound),
    modelId: asString(input.modelId) ?? fallbackModelId,
    referenceImageFileId: asString(input.referenceImageFileId),
    collectionAssetId: asString(input.collectionAssetId),
    savedReferenceId: asString(input.savedReferenceId),
    durationSec: asNumber(input.durationSec),
    removeTextOverlays: input.removeTextOverlays === true,
    sourceVideoSnapshot,
    sourceVideo,
    sceneImageUrl: asString(input.sceneImageUrl),
    videoUrl: asString(input.videoUrl),
    identityPackId: asString(input.identityPackId) ?? null,
    identityElementImageUrls: Array.isArray(input.identityElementImageUrls)
      ? input.identityElementImageUrls.filter((url): url is string => typeof url === "string")
      : undefined,
    usedKlingElementBinding: input.usedKlingElementBinding === true,
    textErasureCost: asNumber(input.textErasureCost),
  };
}
