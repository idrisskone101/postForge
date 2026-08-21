import { randomUUID } from "crypto";
import * as path from "path";
import type { TikTokSource } from "@/generated/prisma/client";
import { isStoragePathUnder, storage } from "@/lib/storage";
import {
  SOURCE_VIDEO_PATH_PREFIXES,
  type SourceVideoSnapshot,
} from "@/lib/ugc/clone-job-input";

export async function createSourceVideoSnapshot(
  source: {
    id: string;
    label: string;
    originalUrl: string;
    filename: string;
    durationSec: number;
    width: number;
    height: number;
  },
  localPath: string
): Promise<SourceVideoSnapshot> {
  const sourceFullPath = await storage.ensureLocalFile(localPath);
  const extension = path.extname(source.filename) || path.extname(localPath) || ".mp4";
  const snapshotFilename = `${randomUUID()}${extension}`;
  const snapshotLocalPath = await storage.saveFromFile(
    "ugc-clone-sources",
    snapshotFilename,
    sourceFullPath
  );

  return {
    sourceId: source.id,
    label: source.label,
    originalUrl: source.originalUrl,
    localPath: snapshotLocalPath,
    filename: snapshotFilename,
    durationSec: source.durationSec,
    width: source.width,
    height: source.height,
  };
}

export function sourceToSnapshot(source: TikTokSource, localPath: string): SourceVideoSnapshot {
  return {
    sourceId: source.id,
    label: source.label,
    originalUrl: source.originalUrl,
    localPath,
    filename: source.filename,
    durationSec: source.durationSec,
    width: source.width,
    height: source.height,
  };
}

export function isTrustedSourceVideoPath(
  source: TikTokSource,
  localPath: string,
  sourceVideoSnapshot?: SourceVideoSnapshot
): boolean {
  if (!isStoragePathUnder(localPath, SOURCE_VIDEO_PATH_PREFIXES)) {
    return false;
  }

  if (localPath === source.localPath) {
    return true;
  }

  return (
    !!sourceVideoSnapshot &&
    sourceVideoSnapshot.sourceId === source.id &&
    sourceVideoSnapshot.localPath === localPath
  );
}
