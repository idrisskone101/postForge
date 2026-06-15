import type { Prisma } from "@/generated/prisma/client";

export const AVATAR_ORIGINS = ["uploaded", "imported", "generated", "gallery"] as const;

export type AvatarOrigin = (typeof AVATAR_ORIGINS)[number];

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AvatarProvenance = {
  avatarProfile?: JsonValue;
  seedReferenceImages?: JsonValue[];
};

export type AvatarCreateInput = {
  name: string;
  localPath: string;
  filename: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  fileSizeBytes?: number | null;
  origin?: unknown;
  provenance?: AvatarProvenance | null;
};

type AvatarApiRecord = {
  id: string;
  name: string;
  localPath: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  origin?: string | null;
  provenance?: unknown;
  identityPacks?: {
    id: string;
    status: string;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeAvatarOrigin(origin: unknown): AvatarOrigin {
  return AVATAR_ORIGINS.includes(origin as AvatarOrigin)
    ? (origin as AvatarOrigin)
    : "uploaded";
}

export function normalizeAvatarProvenance(provenance: unknown): AvatarProvenance | null {
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    return null;
  }

  const record = provenance as AvatarProvenance;
  return {
    ...(isJsonValue(record.avatarProfile) ? { avatarProfile: record.avatarProfile } : {}),
    seedReferenceImages: Array.isArray(record.seedReferenceImages)
      ? record.seedReferenceImages.filter(isJsonValue)
      : [],
  };
}

export function buildAvatarCreateData(input: AvatarCreateInput): Prisma.AvatarCreateInput {
  const provenance = normalizeAvatarProvenance(input.provenance);

  return {
    name: input.name,
    localPath: input.localPath,
    filename: input.filename,
    mimeType: input.mimeType,
    width: input.width,
    height: input.height,
    fileSizeBytes: input.fileSizeBytes,
    origin: normalizeAvatarOrigin(input.origin),
    ...(provenance ? { provenance } : {}),
  };
}

export function summarizeAvatarProvenance(provenance: unknown) {
  const normalized = normalizeAvatarProvenance(provenance);

  return {
    hasAvatarProfile: Boolean(
      normalized && Object.prototype.hasOwnProperty.call(normalized, "avatarProfile")
    ),
    seedReferenceImageCount: normalized?.seedReferenceImages?.length ?? 0,
  };
}

export function serializeAvatarApiRecord(record: AvatarApiRecord) {
  const latestIdentityPack = getLatestIdentityPack(record.identityPacks ?? []);

  return {
    id: record.id,
    name: record.name,
    localPath: record.localPath,
    filename: record.filename,
    mimeType: record.mimeType,
    width: record.width,
    height: record.height,
    fileSizeBytes: record.fileSizeBytes,
    origin: normalizeAvatarOrigin(record.origin),
    provenanceSummary: summarizeAvatarProvenance(record.provenance),
    identityPack: latestIdentityPack
      ? {
        id: latestIdentityPack.id,
        status: latestIdentityPack.status,
        error: latestIdentityPack.error,
      }
      : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function getLatestIdentityPack(
  identityPacks: NonNullable<AvatarApiRecord["identityPacks"]>
) {
  return [...identityPacks].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )[0] ?? null;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value !== "object") {
    return false;
  }

  return Object.values(value).every(isJsonValue);
}
