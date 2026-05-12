import * as fs from "fs/promises";
import * as path from "path";
import { prisma } from "@/lib/db";

const STORAGE_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

function invalidStoragePath(localPath: string): NodeJS.ErrnoException {
  const err = new Error(`Invalid storage path: ${localPath}`) as NodeJS.ErrnoException;
  err.code = "EINVAL";
  return err;
}

function normalizeStoragePath(localPath: string): string {
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

function resolveWithinBase(basePath: string, localPath: string): string {
  const base = path.resolve(basePath);
  const normalized = normalizeStoragePath(localPath);
  const fullPath = path.resolve(base, normalized);
  const relative = path.relative(base, fullPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw invalidStoragePath(localPath);
  }

  return fullPath;
}

function buildRelativePath(type: string, filename: string): string {
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

async function fileExists(fullPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(fullPath);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

async function unlinkIfExists(fullPath: string): Promise<void> {
  try {
    await fs.unlink(fullPath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

export interface StorageProvider {
  save(type: string, filename: string, data: Buffer): Promise<string>;
  saveFromFile(type: string, filename: string, sourcePath: string): Promise<string>;
  read(localPath: string): Promise<Buffer>;
  delete(localPath: string): Promise<void>;
  exists(localPath: string): Promise<boolean>;
  ensureLocalFile(localPath: string): Promise<string>;
}

class LocalStorageDriver implements StorageProvider {
  constructor(
    private readonly basePath =
      process.env.STORAGE_LOCAL_PATH || path.resolve("./data/outputs")
  ) {}

  private getFullPath(localPath: string): string {
    return resolveWithinBase(this.basePath, localPath);
  }

  async save(type: string, filename: string, data: Buffer): Promise<string> {
    const relativePath = buildRelativePath(type, filename);
    const fullPath = this.getFullPath(relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);

    return relativePath;
  }

  async saveFromFile(
    type: string,
    filename: string,
    sourcePath: string
  ): Promise<string> {
    const relativePath = buildRelativePath(type, filename);
    const fullPath = this.getFullPath(relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.copyFile(sourcePath, fullPath);

    return relativePath;
  }

  async read(localPath: string): Promise<Buffer> {
    return fs.readFile(this.getFullPath(localPath));
  }

  async delete(localPath: string): Promise<void> {
    await unlinkIfExists(this.getFullPath(localPath));
  }

  async exists(localPath: string): Promise<boolean> {
    return fileExists(this.getFullPath(localPath));
  }

  async ensureLocalFile(localPath: string): Promise<string> {
    const fullPath = this.getFullPath(localPath);
    if (!(await fileExists(fullPath))) {
      const err = new Error(`File not found: ${localPath}`) as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }
    return fullPath;
  }
}

class DatabaseStorageDriver implements StorageProvider {
  constructor(
    private readonly cacheBasePath = path.resolve(".cache/postforge-storage"),
    private readonly legacyBasePath =
      process.env.STORAGE_LOCAL_PATH || path.resolve("./data/outputs")
  ) {}

  private getCachePath(localPath: string): string {
    return resolveWithinBase(this.cacheBasePath, localPath);
  }

  private getLegacyPath(localPath: string): string {
    return resolveWithinBase(this.legacyBasePath, localPath);
  }

  private async persistAsset(localPath: string, data: Buffer): Promise<void> {
    const safeLocalPath = normalizeStoragePath(localPath);
    const bytes = Uint8Array.from(data);

    await prisma.storedAsset.upsert({
      where: { key: safeLocalPath },
      update: { data: bytes },
      create: { key: safeLocalPath, data: bytes },
    });

    const cachePath = this.getCachePath(safeLocalPath);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, data);
  }

  private async readLegacyAsset(localPath: string): Promise<Buffer> {
    const legacyPath = this.getLegacyPath(localPath);

    try {
      const data = await fs.readFile(legacyPath);
      await this.persistAsset(localPath, data);
      return data;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ENOENT" || code === "EISDIR") {
        const notFound = new Error(`File not found: ${localPath}`) as NodeJS.ErrnoException;
        notFound.code = "ENOENT";
        throw notFound;
      }
      throw err;
    }
  }

  async save(type: string, filename: string, data: Buffer): Promise<string> {
    const relativePath = buildRelativePath(type, filename);
    await this.persistAsset(relativePath, data);
    return relativePath;
  }

  async saveFromFile(
    type: string,
    filename: string,
    sourcePath: string
  ): Promise<string> {
    const data = await fs.readFile(sourcePath);
    return this.save(type, filename, data);
  }

  async read(localPath: string): Promise<Buffer> {
    const safeLocalPath = normalizeStoragePath(localPath);
    const asset = await prisma.storedAsset.findUnique({
      where: { key: safeLocalPath },
      select: { data: true },
    });

    if (asset) {
      return Buffer.from(asset.data);
    }

    return this.readLegacyAsset(safeLocalPath);
  }

  async delete(localPath: string): Promise<void> {
    const safeLocalPath = normalizeStoragePath(localPath);
    await Promise.all([
      prisma.storedAsset.deleteMany({ where: { key: safeLocalPath } }),
      unlinkIfExists(this.getCachePath(safeLocalPath)),
      unlinkIfExists(this.getLegacyPath(safeLocalPath)),
    ]);
  }

  async exists(localPath: string): Promise<boolean> {
    const safeLocalPath = normalizeStoragePath(localPath);
    const asset = await prisma.storedAsset.findUnique({
      where: { key: safeLocalPath },
      select: { data: true },
    });

    if (asset) {
      return Buffer.from(asset.data).length > 0;
    }

    return fileExists(this.getLegacyPath(safeLocalPath));
  }

  async ensureLocalFile(localPath: string): Promise<string> {
    const cachePath = this.getCachePath(localPath);
    if (await fileExists(cachePath)) {
      return cachePath;
    }

    const data = await this.read(localPath);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, data);
    return cachePath;
  }
}

export async function downloadFromUrl(
  url: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download from ${url}: ${response.status} ${response.statusText}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, contentType };
}

export const storage: StorageProvider =
  process.env.STORAGE_DRIVER === "local"
    ? new LocalStorageDriver()
    : new DatabaseStorageDriver();
