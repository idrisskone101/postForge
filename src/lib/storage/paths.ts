import * as path from "path";

const STORAGE_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

function invalidStoragePath(localPath: string): NodeJS.ErrnoException {
  const err = new Error(`Invalid storage path: ${localPath}`) as NodeJS.ErrnoException;
  err.code = "EINVAL";
  return err;
}

export function normalizeStoragePath(localPath: string): string {
  if (!localPath || path.isAbsolute(localPath) || localPath.includes("\\")) {
    throw invalidStoragePath(localPath);
  }

  const normalized = path.posix.normalize(localPath);
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.isAbsolute(normalized)
  ) {
    throw invalidStoragePath(localPath);
  }

  const segments = normalized.split("/");
  if (
    segments.length === 0 ||
    segments.some((segment) => !STORAGE_SEGMENT_PATTERN.test(segment))
  ) {
    throw invalidStoragePath(localPath);
  }

  return normalized;
}

function assertStorageSegment(value: string, label: string): void {
  if (!STORAGE_SEGMENT_PATTERN.test(value)) {
    throw new Error(`Invalid storage ${label}: ${value}`);
  }
}

export function resolveWithinBase(basePath: string, localPath: string): string {
  const base = path.resolve(basePath);
  const normalized = normalizeStoragePath(localPath);
  const fullPath = path.resolve(base, normalized);
  const relative = path.relative(base, fullPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw invalidStoragePath(localPath);
  }

  return fullPath;
}

export function buildRelativePath(type: string, filename: string): string {
  assertStorageSegment(type, "type");
  assertStorageSegment(filename, "filename");
  const today = new Date().toISOString().split("T")[0];
  return path.posix.join(type, today, filename);
}

export function isStoragePathUnder(
  localPath: string,
  allowedPrefixes: string[]
): boolean {
  try {
    const normalized = normalizeStoragePath(localPath);
    return allowedPrefixes.some((prefix) => {
      const normalizedPrefix = normalizeStoragePath(prefix);
      return (
        normalized === normalizedPrefix ||
        normalized.startsWith(`${normalizedPrefix}/`)
      );
    });
  } catch {
    return false;
  }
}
