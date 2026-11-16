import { createHash } from "node:crypto";

/**
 * Sample rows keep the same id across every restore, so a link a visitor has
 * open keeps working after the workspace is put back.
 */
export function demoId(key: string): string {
  const hex = createHash("sha1").update(`postforge-demo:${key}`).digest("hex");
  const variant = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

export type Age = { days?: number; hours?: number; minutes?: number };

/** A moment `age` before `now`. Sample history is always relative to the restore. */
export function before(now: Date, age: Age): Date {
  const minutes =
    (age.days ?? 0) * 24 * 60 + (age.hours ?? 0) * 60 + (age.minutes ?? 0);
  return new Date(now.getTime() - minutes * 60_000);
}

export function basename(assetPath: string): string {
  return assetPath.slice(assetPath.lastIndexOf("/") + 1);
}
