import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { serializeAvatarApiRecord } from "@/lib/avatar-provenance";
import { ensureAvatarIdentityPack } from "@/lib/ugc/avatar-identity-pack";
import {
  acceptAvatarCandidateAsImportedAvatar,
  type ImportedAvatarSeedReferenceImage,
} from "@/lib/avatar-import-acceptance";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fileId = readString(body.fileId);
    const name = readString(body.name) || "Imported Avatar";
    const rawAvatarProfileJson = readString(body.rawAvatarProfileJson);
    const candidateFileIds = readStringArray(body.candidateFileIds);
    const seedReferenceImages = readSeedReferenceImages(body.seedReferenceImages);

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    if (!rawAvatarProfileJson) {
      return NextResponse.json(
        { error: "rawAvatarProfileJson is required" },
        { status: 400 }
      );
    }

    const result = await acceptAvatarCandidateAsImportedAvatar(
      {
        fileId,
        candidateFileIds,
        name,
        rawAvatarProfileJson,
        seedReferenceImages,
      },
      {
        findGeneratedImageFile: (candidateFileId) =>
          prisma.generatedFile.findUnique({ where: { id: candidateFileId } }),
        readStorage: (localPath) => storage.read(localPath),
        saveAvatarImage: (filename, data) => storage.save("avatars", filename, data),
        createAvatar: (data) => prisma.avatar.create({ data }),
        discardGeneratedFiles: async (fileIds) => {
          const files = await prisma.generatedFile.findMany({
            where: { id: { in: fileIds } },
            select: { id: true, localPath: true },
          });

          await Promise.all(files.map((file) => storage.delete(file.localPath).catch(() => {})));
          await prisma.generatedFile.deleteMany({
            where: { id: { in: files.map((file) => file.id) } },
          });
        },
        ensureIdentityPack: (avatarId) => ensureAvatarIdentityPack(avatarId),
      }
    );

    return NextResponse.json(
      {
        avatar: serializeAvatarApiRecord(result.avatar),
        identityPack: {
          id: result.identityPack.id,
          status: result.identityPack.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to import avatar candidate:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import avatar candidate" },
      { status: 500 }
    );
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readSeedReferenceImages(value: unknown): ImportedAvatarSeedReferenceImage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = readString(record.name);
      const type = readString(record.type) || "image";
      const size = typeof record.size === "number" && Number.isFinite(record.size)
        ? record.size
        : 0;

      return name ? { name, type, size } : null;
    })
    .filter((item): item is ImportedAvatarSeedReferenceImage => item !== null);
}
