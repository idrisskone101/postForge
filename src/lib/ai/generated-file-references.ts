import { uploadToFalStorage } from "@/lib/ai/fal-client";
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
