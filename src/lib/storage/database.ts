import * as fs from "fs/promises";
import * as path from "path";
import { prisma } from "@/lib/db";
import {
  fileExists,
  readFileRange,
  storedFileSize,
  unlinkIfExists,
  validateReadRange,
} from "./fs";
import { buildRelativePath, normalizeStoragePath, resolveWithinBase } from "./paths";

export class DatabaseStorageDriver {
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

  private async legacyAssetSize(localPath: string): Promise<number> {
    return storedFileSize(this.getLegacyPath(localPath));
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

  async readRange(localPath: string, start: number, end: number): Promise<Buffer> {
    validateReadRange(start, end);
    const safeLocalPath = normalizeStoragePath(localPath);
    const length = end - start + 1;
    const rows = await prisma.$queryRaw<Array<{ data: Uint8Array }>>`
      SELECT substring("data" FROM ${start + 1} FOR ${length}) AS "data"
      FROM "StoredAsset"
      WHERE "key" = ${safeLocalPath}
    `;
    if (rows[0]) return Buffer.from(rows[0].data);
    return readFileRange(this.getLegacyPath(safeLocalPath), start, end);
  }

  async size(localPath: string): Promise<number> {
    const safeLocalPath = normalizeStoragePath(localPath);
    const rows = await prisma.$queryRaw<Array<{ size: bigint | number }>>`
      SELECT octet_length("data") AS "size"
      FROM "StoredAsset"
      WHERE "key" = ${safeLocalPath}
    `;
    if (rows[0]) {
      const size = Number(rows[0].size);
      if (!Number.isSafeInteger(size) || size < 0) {
        throw new Error("Stored asset size is outside the supported range");
      }
      return size;
    }
    return this.legacyAssetSize(safeLocalPath);
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
    if (!localPath) return false;
    let safeLocalPath: string;
    try {
      safeLocalPath = normalizeStoragePath(localPath);
    } catch {
      return false;
    }
    const asset = await prisma.storedAsset.findUnique({
      where: { key: safeLocalPath },
      select: { key: true },
    });

    if (asset) return true;

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
