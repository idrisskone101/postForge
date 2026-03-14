import * as fs from "fs/promises";
import * as path from "path";

export interface StorageProvider {
  save(type: string, filename: string, data: Buffer): Promise<string>;
  read(localPath: string): Promise<Buffer>;
  delete(localPath: string): Promise<void>;
  exists(localPath: string): Promise<boolean>;
  getFullPath(localPath: string): string;
}

export class LocalStorageDriver implements StorageProvider {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || process.env.STORAGE_LOCAL_PATH || "./data/outputs";
  }

  async save(type: string, filename: string, data: Buffer): Promise<string> {
    const today = new Date().toISOString().split("T")[0]; // e.g., 2026-03-07
    const relativePath = path.join(type, today, filename);
    const fullPath = this.getFullPath(relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);

    return relativePath;
  }

  async read(localPath: string): Promise<Buffer> {
    const fullPath = this.getFullPath(localPath);
    return fs.readFile(fullPath);
  }

  async delete(localPath: string): Promise<void> {
    const fullPath = this.getFullPath(localPath);
    try {
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }

  async exists(localPath: string): Promise<boolean> {
    const fullPath = this.getFullPath(localPath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getFullPath(localPath: string): string {
    return path.resolve(this.basePath, localPath);
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

export const storage = new LocalStorageDriver();
