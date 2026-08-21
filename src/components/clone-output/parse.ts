import type { SourceVideoInput } from "@/components/clone-output/types";

export function parseSourceVideo(value: unknown): SourceVideoInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  if (
    typeof input.sourceId !== "string" ||
    typeof input.label !== "string" ||
    typeof input.originalUrl !== "string" ||
    typeof input.localPath !== "string" ||
    typeof input.filename !== "string" ||
    typeof input.durationSec !== "number" ||
    typeof input.width !== "number" ||
    typeof input.height !== "number"
  ) {
    return null;
  }

  return {
    sourceId: input.sourceId,
    label: input.label,
    originalUrl: input.originalUrl,
    localPath: input.localPath,
    filename: input.filename,
    durationSec: input.durationSec,
    width: input.width,
    height: input.height,
  };
}

export function getStringInput(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "string" ? input[key] : null;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return minutes > 0
    ? `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    : `${remainingSeconds}s`;
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  const megabytes = bytes / 1_000_000;
  return `${megabytes.toFixed(megabytes >= 10 ? 1 : 2)}MB`;
}
