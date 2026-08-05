import { uploadToFalStorage } from "@/lib/ai/fal-client";
import { extractReferenceFrame } from "@/lib/ugc/extract-frame";
import { CollectionAssetRequestError } from "@/lib/collection-assets-server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export function parseReferenceFileIds(value: unknown): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 14 ||
    !value.every(
      (id) => typeof id === "string" && id.trim().length > 0 && id.length <= 100
    )
  ) {
    throw new Error("referenceFileIds must contain 1 to 14 generated file ids");
  }
  return [...new Set(value)];
}

export function parseSingleVideoReferenceFileId(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 100) {
    throw new Error("referenceFileId must be a single generated file id");
  }
  return value.trim();
}

export async function resolveGeneratedImageReferences(ids: string[]) {
  if (ids.length === 0) return [];
  const files = await prisma.generatedFile.findMany({
    where: { id: { in: ids } },
    select: { id: true, type: true, mimeType: true, localPath: true },
  });
  const byId = new Map(files.map((file) => [file.id, file]));
  return Promise.all(
    ids.map(async (id) => {
      const file = byId.get(id);
      if (!file || file.type !== "image" || !file.mimeType.startsWith("image/")) {
        throw new Error(`Image reference was not found: ${id}`);
      }
      return uploadToFalStorage(await storage.ensureLocalFile(file.localPath));
    })
  );
}

/**
 * Resolve a single server-owned output as a video seed reference. Images are
 * uploaded directly; videos have their first frame extracted with ffmpeg so
 * the character can carry into the next generation. Provider URLs are never
 * persisted inputs, only server-owned file ids are.
 */
export async function resolveVideoReferenceImage(id: string): Promise<string> {
  const file = await prisma.generatedFile.findUnique({
    where: { id },
    select: { id: true, type: true, mimeType: true, localPath: true },
  });
  if (!file || file.type === "image") {
    if (!file || !file.mimeType.startsWith("image/")) {
      throw new CollectionAssetRequestError(
        `Video seed reference was not found: ${id}`
      );
    }
    return uploadToFalStorage(await storage.ensureLocalFile(file.localPath));
  }

  const localPath = await storage.ensureLocalFile(file.localPath);
  const framePath = await extractReferenceFrame(localPath);
  try {
    return await uploadToFalStorage(framePath);
  } finally {
    await import("fs/promises")
      .then((fs) => fs.unlink(framePath))
      .catch(() => {});
  }
}
