import * as fs from "fs/promises";
import * as path from "path";
import {
  fileExists,
  readFileRange,
  storedFileSize,
  unlinkIfExists,
} from "./fs";
import { buildRelativePath, resolveWithinBase } from "./paths";

export class LocalStorageDriver {
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

  async readRange(localPath: string, start: number, end: number): Promise<Buffer> {
    return readFileRange(this.getFullPath(localPath), start, end);
  }

  async size(localPath: string): Promise<number> {
    return storedFileSize(this.getFullPath(localPath));
  }

  async delete(localPath: string): Promise<void> {
    await unlinkIfExists(this.getFullPath(localPath));
  }

  async exists(localPath: string): Promise<boolean> {
    if (!localPath) return false;
    try {
      return await fileExists(this.getFullPath(localPath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EINVAL") return false;
      throw error;
    }
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
