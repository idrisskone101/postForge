import type { Prisma } from "@/generated/prisma/client";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function recordOrEmpty(value: unknown) {
  return isRecord(value) ? value : {};
}

export function stripSlideshowClientId(value: unknown) {
  if (!isRecord(value)) return undefined;
  const result = { ...recordOrEmpty(value) };
  delete result.clientId;
  return result;
}

export function stripSlideshowProjectActivity(value: unknown) {
  const result = stripSlideshowClientId(value);
  if (!result) return undefined;
  delete result.successfulExportCount;
  delete result.lastExportedAt;
  delete result.lastExportFormat;
  delete result.exportHistory;
  return result;
}

export function copySlideshowAutomationSourceContent(
  value: unknown,
  reuseVisuals: boolean,
) {
  const result = stripSlideshowClientId(value) ?? {};
  if (!reuseVisuals) {
    // Preview and export intentionally prioritize explicit collection URLs.
    // Fresh-image runs must clear them so the newly attached generated file is
    // the active visual instead of a paid-but-hidden background.
    result.imageUrls = [];
    result.visualKeys = [];
  }
  return result;
}

export function jsonObject(
  value: unknown,
  fallback: Record<string, unknown>,
): Prisma.InputJsonObject {
  const source = isRecord(value) ? value : fallback;
  return JSON.parse(JSON.stringify(source)) as Prisma.InputJsonObject;
}

export function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}
