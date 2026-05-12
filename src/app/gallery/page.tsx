import { prisma } from "@/lib/db";
import { getAllModels } from "@/lib/ai/models";
import { storage } from "@/lib/storage";
import { GalleryPageClient } from "./gallery-page-client";

export const metadata = { title: "Gallery - PostForge" };

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

function extractTikTokSource(inputValue: unknown): {
  id: string | null;
  localPath: string | null;
  originalUrl: string | null;
} {
  const input = asRecord(inputValue);
  const sourceVideo = asRecord(input?.sourceVideo);
  const sourceVideoSnapshot = asRecord(input?.sourceVideoSnapshot);
  const source = sourceVideo ?? sourceVideoSnapshot;

  return {
    id: asString(input?.tiktokSourceId) ?? asString(source?.sourceId),
    localPath: asString(input?.tiktokVideoPath) ?? asString(source?.localPath),
    originalUrl: asString(source?.originalUrl),
  };
}

export default async function GalleryPage() {
  const files = await prisma.generatedFile.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      job: { select: { model: true, prompt: true, input: true, tags: true } },
    },
  });

  const validFiles = (
    await Promise.all(
      files.map(async (file) =>
        (await storage.exists(file.localPath)) ? file : null
      )
    )
  ).filter(Boolean) as typeof files;

  const cloneSources = validFiles
    .filter(
      (file) => file.type === "video" && file.job.tags.includes("ugc-clone")
    )
    .map((file) => extractTikTokSource(file.job.input));
  const sourceIds = Array.from(
    new Set(
      cloneSources
        .map((source) => source.id)
        .filter((id): id is string => id !== null)
    )
  );
  const sourcePaths = Array.from(
    new Set(
      cloneSources
        .map((source) => source.localPath)
        .filter((localPath): localPath is string => localPath !== null)
    )
  );
  const dbSources =
    sourceIds.length > 0 || sourcePaths.length > 0
      ? await prisma.tikTokSource.findMany({
          where: {
            OR: [
              ...(sourceIds.length > 0 ? [{ id: { in: sourceIds } }] : []),
              ...(sourcePaths.length > 0
                ? [{ localPath: { in: sourcePaths } }]
                : []),
            ],
          },
          select: { id: true, localPath: true, originalUrl: true },
        })
      : [];
  const sourceUrlsById = new Map(
    dbSources.map((source) => [source.id, source.originalUrl])
  );
  const sourceUrlsByPath = new Map(
    dbSources.map((source) => [source.localPath, source.originalUrl])
  );

  const items = validFiles.map((file) => {
    const isUgcCloneVideo =
      file.type === "video" && file.job.tags.includes("ugc-clone");
    const source = isUgcCloneVideo ? extractTikTokSource(file.job.input) : null;

    return {
      id: file.id,
      jobId: file.jobId,
      type: file.type as "image" | "video",
      url: `/api/files/${file.id}`,
      filename: file.filename,
      width: file.width ?? undefined,
      height: file.height ?? undefined,
      durationSec: file.durationSec ?? undefined,
      model: file.job.model,
      prompt: file.job.prompt,
      tiktokSourceUrl:
        source?.originalUrl ??
        (source?.id ? sourceUrlsById.get(source.id) : undefined) ??
        (source?.localPath
          ? sourceUrlsByPath.get(source.localPath)
          : undefined),
      createdAt: file.createdAt.toISOString(),
    };
  });

  const models = getAllModels().map((m) => ({ id: m.id, name: m.name }));

  return <GalleryPageClient items={items} models={models} />;
}
