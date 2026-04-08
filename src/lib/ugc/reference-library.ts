import * as path from "path";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { Prisma } from "@/generated/prisma/client";
import type { UgcReferenceImage } from "@/generated/prisma/client";

const globalForReferenceBackfill = globalThis as unknown as {
  __postforge_reference_library_backfill_promise?: Promise<void>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

function toJsonValue(
  value: unknown
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildSavedReferenceFilename(fileId: string, filename: string, mimeType: string): string {
  const ext = path.extname(filename).replace(/^\./, "");
  if (ext) {
    return `${fileId}.${ext}`;
  }

  if (mimeType.includes("png")) {
    return `${fileId}.png`;
  }

  return `${fileId}.jpg`;
}

async function resolveTikTokSourceId(
  requestedSourceId: string | null,
  sourceVideoPathSnapshot: string
): Promise<string | null> {
  if (requestedSourceId) {
    const source = await prisma.tikTokSource.findUnique({
      where: { id: requestedSourceId },
      select: { id: true },
    });

    if (source) {
      return source.id;
    }
  }

  const source = await prisma.tikTokSource.findFirst({
    where: { localPath: sourceVideoPathSnapshot },
    select: { id: true },
  });

  return source?.id ?? null;
}

export async function persistUgcReferenceImageFromJob(
  jobId: string
): Promise<{ reference: UgcReferenceImage; created: boolean } | null> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: {
      outputs: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!job || !job.tags.includes("ugc-clone-ref")) {
    return null;
  }

  const input = asRecord(job.input);
  if (!input) {
    return null;
  }

  const avatarId = asString(input.avatarId);
  const sourceVideoPathSnapshot = asString(input.tiktokVideoPath);
  if (!avatarId || !sourceVideoPathSnapshot) {
    return null;
  }

  const output = job.outputs.find((file) => file.type === "image");
  if (!output || !output.localPath) {
    return null;
  }

  const existing = await prisma.ugcReferenceImage.findUnique({
    where: { originGeneratedFileId: output.id },
  });
  if (existing) {
    return { reference: existing, created: false };
  }

  const avatar = await prisma.avatar.findUnique({
    where: { id: avatarId },
    select: { id: true },
  });
  if (!avatar) {
    return null;
  }

  const requestedSourceId = asString(input.tiktokSourceId);
  const tikTokSourceId = await resolveTikTokSourceId(
    requestedSourceId,
    sourceVideoPathSnapshot
  );

  const buffer = await storage.read(output.localPath);
  if (buffer.length === 0) {
    return null;
  }

  const filename = buildSavedReferenceFilename(
    output.id,
    output.filename,
    output.mimeType
  );
  const localPath = await storage.save("ugc-references", filename, buffer);

  try {
    const reference = await prisma.ugcReferenceImage.create({
      data: {
        avatarId,
        tikTokSourceId,
        originJobId: job.id,
        originGeneratedFileId: output.id,
        sourceVideoPathSnapshot,
        prompt: asString(input.prompt) ?? "",
        sceneAnalysis: toJsonValue(input.sceneAnalysis),
        localPath,
        filename,
        mimeType: output.mimeType,
        width: output.width,
        height: output.height,
        fileSizeBytes: output.fileSizeBytes ?? buffer.length,
      },
    });

    return { reference, created: true };
  } catch (error) {
    await storage.delete(localPath).catch(() => {});

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const duplicate = await prisma.ugcReferenceImage.findUnique({
        where: { originGeneratedFileId: output.id },
      });
      if (duplicate) {
        return { reference: duplicate, created: false };
      }
    }

    throw error;
  }
}

export async function backfillUgcReferenceImages(): Promise<void> {
  if (!globalForReferenceBackfill.__postforge_reference_library_backfill_promise) {
    globalForReferenceBackfill.__postforge_reference_library_backfill_promise =
      runUgcReferenceImageBackfill();
  }

  await globalForReferenceBackfill.__postforge_reference_library_backfill_promise;
}

async function runUgcReferenceImageBackfill(): Promise<void> {
  const jobs = await prisma.generationJob.findMany({
    where: {
      type: "image",
      status: "completed",
      tags: { has: "ugc-clone-ref" },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let importedCount = 0;

  for (const job of jobs) {
    try {
      const result = await persistUgcReferenceImageFromJob(job.id);
      if (result?.created) {
        importedCount += 1;
      }
    } catch (error) {
      console.warn(
        `[ugc-reference-library] Failed to backfill reference from job ${job.id}:`,
        error
      );
    }
  }

  if (importedCount > 0) {
    console.log(
      `[ugc-reference-library] Backfilled ${importedCount} saved reference image(s)`
    );
  }
}
