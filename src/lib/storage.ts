import { DatabaseStorageDriver } from "./storage/database";
import { LocalStorageDriver } from "./storage/local";
import {
  RailwayS3StorageDriver,
  railwayS3StorageConfigFromEnvironment,
} from "./storage/s3";

export { isStoragePathUnder, normalizeStoragePath } from "./storage/paths";
export type { RailwayS3StorageConfig } from "./storage/s3";
export { RailwayS3StorageDriver, railwayS3StorageConfigFromEnvironment };

export interface StorageProvider {
  save(type: string, filename: string, data: Buffer): Promise<string>;
  saveFromFile(type: string, filename: string, sourcePath: string): Promise<string>;
  read(localPath: string): Promise<Buffer>;
  readRange(localPath: string, start: number, end: number): Promise<Buffer>;
  size(localPath: string): Promise<number>;
  delete(localPath: string): Promise<void>;
  exists(localPath: string): Promise<boolean>;
  ensureLocalFile(localPath: string): Promise<string>;
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

function createStorageProvider(): StorageProvider {
  switch (process.env.STORAGE_DRIVER) {
    case "local":
      return new LocalStorageDriver();
    case "s3":
      return new RailwayS3StorageDriver(
        railwayS3StorageConfigFromEnvironment()
      );
    case "database":
    case undefined:
    case "":
      return new DatabaseStorageDriver();
    default:
      throw new Error(`Unsupported STORAGE_DRIVER: ${process.env.STORAGE_DRIVER}`);
  }
}

export const storage: StorageProvider = createStorageProvider();
