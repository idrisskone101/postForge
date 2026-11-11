import * as fs from "fs/promises";
import * as path from "path";
import { DatabaseStorageDriver } from "./database";
import {
  fileExists,
  readFileRange,
  storedFileSize,
  validateReadRange,
} from "./fs";
import { normalizeStoragePath, resolveWithinBase } from "./paths";

export const DEMO_ASSETS_DIRECTORY = "demo/assets";

/**
 * Storage for the demo workspace.
 *
 * Sample media ships with the repository and is served straight from disk, so
 * it is read-only: a visitor deleting a sample output removes the row, never
 * the file, and the scheduled restore brings the row back. Anything the app
 * writes while the demo runs (an export, an avatar made from a sample output)
 * lands in the demo database as an overlay and is cleared by the restore.
 */
export class DemoStorageDriver {
  constructor(
    private readonly seedBasePath = path.resolve(DEMO_ASSETS_DIRECTORY),
    private readonly overlay = new DatabaseStorageDriver(
      path.resolve(".cache/postforge-demo-storage"),
      path.resolve(".cache/postforge-demo-legacy")
    )
  ) {}

  private seedPath(localPath: string): string {
    return resolveWithinBase(this.seedBasePath, localPath);
  }

  private async isSeedAsset(localPath: string): Promise<boolean> {
    try {
      return await fileExists(this.seedPath(localPath));
    } catch {
      return false;
    }
  }

  save(type: string, filename: string, data: Buffer): Promise<string> {
    return this.overlay.save(type, filename, data);
  }

  saveFromFile(type: string, filename: string, sourcePath: string): Promise<string> {
    return this.overlay.saveFromFile(type, filename, sourcePath);
  }

  async read(localPath: string): Promise<Buffer> {
    if (await this.isSeedAsset(localPath)) {
      return fs.readFile(this.seedPath(localPath));
    }
    return this.overlay.read(localPath);
  }

  async readRange(localPath: string, start: number, end: number): Promise<Buffer> {
    validateReadRange(start, end);
    if (await this.isSeedAsset(localPath)) {
      return readFileRange(this.seedPath(localPath), start, end);
    }
    return this.overlay.readRange(localPath, start, end);
  }

  async size(localPath: string): Promise<number> {
    if (await this.isSeedAsset(localPath)) {
      return storedFileSize(this.seedPath(localPath));
    }
    return this.overlay.size(localPath);
  }

  async delete(localPath: string): Promise<void> {
    normalizeStoragePath(localPath);
    await this.overlay.delete(localPath);
  }

  async exists(localPath: string): Promise<boolean> {
    if (!localPath) return false;
    if (await this.isSeedAsset(localPath)) return true;
    return this.overlay.exists(localPath);
  }

  async ensureLocalFile(localPath: string): Promise<string> {
    if (await this.isSeedAsset(localPath)) return this.seedPath(localPath);
    return this.overlay.ensureLocalFile(localPath);
  }
}
