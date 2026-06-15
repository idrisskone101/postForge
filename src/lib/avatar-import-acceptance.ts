import { randomUUID } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { buildAvatarCreateData } from "@/lib/avatar-provenance";

type GeneratedImageFile = {
  id: string;
  localPath: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
};

type ImportedAvatarRecord = {
  id: string;
  name: string;
  localPath: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  origin?: string | null;
  provenance?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type IdentityPackRecord = {
  id: string;
  status: string;
};

export type ImportedAvatarSeedReferenceImage = {
  name: string;
  size: number;
  type: string;
};

export type AcceptAvatarCandidateInput = {
  fileId: string;
  candidateFileIds: string[];
  name: string;
  rawAvatarProfileJson: string;
  seedReferenceImages: ImportedAvatarSeedReferenceImage[];
};

export type AcceptAvatarCandidateDeps = {
  findGeneratedImageFile: (fileId: string) => Promise<GeneratedImageFile | null>;
  readStorage: (localPath: string) => Promise<Buffer>;
  saveAvatarImage: (filename: string, data: Buffer) => Promise<string>;
  createAvatar: (data: Prisma.AvatarCreateInput) => Promise<ImportedAvatarRecord>;
  discardGeneratedFiles: (fileIds: string[]) => Promise<void>;
  ensureIdentityPack: (avatarId: string) => Promise<IdentityPackRecord>;
};

export async function acceptAvatarCandidateAsImportedAvatar(
  input: AcceptAvatarCandidateInput,
  deps: AcceptAvatarCandidateDeps
) {
  const file = await deps.findGeneratedImageFile(input.fileId);
  if (!file) {
    throw new Error("Avatar Candidate not found");
  }

  if (!file.mimeType.startsWith("image/")) {
    throw new Error("Avatar Candidate must be an image");
  }

  const avatarProfile = JSON.parse(input.rawAvatarProfileJson);
  const data = await deps.readStorage(file.localPath);
  const extension = file.filename.split(".").pop() || "png";
  const filename = `${randomUUID()}.${extension}`;
  const localPath = await deps.saveAvatarImage(filename, data);
  const avatar = await deps.createAvatar(buildAvatarCreateData({
    name: normalizeImportedAvatarName(input.name),
    localPath,
    filename,
    mimeType: file.mimeType,
    width: file.width,
    height: file.height,
    fileSizeBytes: file.fileSizeBytes,
    origin: "imported",
    provenance: {
      avatarProfile,
      seedReferenceImages: input.seedReferenceImages,
    },
  }));
  const rejectedCandidateIds = uniqueCandidateIds(input.candidateFileIds)
    .filter((fileId) => fileId !== input.fileId);

  if (rejectedCandidateIds.length > 0) {
    await deps.discardGeneratedFiles(rejectedCandidateIds);
  }

  const identityPack = await deps.ensureIdentityPack(avatar.id);

  return { avatar, identityPack };
}

export function normalizeImportedAvatarName(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 40) : "Imported Avatar";
}

function uniqueCandidateIds(fileIds: string[]): string[] {
  return [...new Set(fileIds.filter((fileId) => fileId.trim() !== ""))];
}
