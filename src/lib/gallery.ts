import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { serializeOutputReviewStatus } from "@/lib/output-review-status";
import type { Prisma } from "@/generated/prisma/client";

export const GALLERY_PAGE_SIZE = 48;

export type GalleryTypeFilter = "all" | "image" | "video";
export type GallerySortOrder = "newest" | "oldest";

export interface GalleryItem {
  id: string;
  jobId: string;
  type: "image" | "video";
  url: string;
  filename: string;
  width?: number;
  height?: number;
  durationSec?: number;
  model: string;
  prompt: string;
  tiktokSourceUrl?: string;
  reviewStatus: ReturnType<typeof serializeOutputReviewStatus>;
  createdAt: string;
}

export interface GalleryPageResult {
  items: GalleryItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

type GalleryFileRecord = {
  id: string;
  jobId: string;
  type: string;
  localPath: string;
  filename: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  reviewStatus: string | null;
  createdAt: Date;
  job: {
    model: string;
    prompt: string;
    input: Prisma.JsonValue;
    tags: string[];
  };
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

async function getTikTokSourceUrls(files: GalleryFileRecord[]) {
  const cloneSources = files
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

  return {
    byId: new Map(dbSources.map((source) => [source.id, source.originalUrl])),
    byPath: new Map(
      dbSources.map((source) => [source.localPath, source.originalUrl])
    ),
  };
}

async function serializeGalleryItems(
  files: GalleryFileRecord[]
): Promise<GalleryItem[]> {
  const sourceUrls = await getTikTokSourceUrls(files);

  return files.map((file) => {
    const isUgcCloneVideo =
      file.type === "video" && file.job.tags.includes("ugc-clone");
    const source = isUgcCloneVideo ? extractTikTokSource(file.job.input) : null;

    return {
      id: file.id,
      jobId: file.jobId,
      type: file.type === "video" ? "video" : "image",
      url: `/api/files/${file.id}`,
      filename: file.filename,
      width: file.width ?? undefined,
      height: file.height ?? undefined,
      durationSec: file.durationSec ?? undefined,
      model: file.job.model,
      prompt: file.job.prompt,
      tiktokSourceUrl:
        source?.originalUrl ??
        (source?.id ? sourceUrls.byId.get(source.id) : undefined) ??
        (source?.localPath ? sourceUrls.byPath.get(source.localPath) : undefined),
      reviewStatus: serializeOutputReviewStatus(file.reviewStatus),
      createdAt: file.createdAt.toISOString(),
    };
  });
}

export async function getGalleryPage({
  cursor,
  limit = GALLERY_PAGE_SIZE,
  type = "all",
  sort = "newest",
}: {
  cursor?: string | null;
  limit?: number;
  type?: GalleryTypeFilter;
  sort?: GallerySortOrder;
}): Promise<GalleryPageResult> {
  const pageSize = Math.min(Math.max(limit, 1), 60);
  const direction = sort === "oldest" ? "asc" : "desc";
  const where = type === "all" ? {} : { type };
  const validFiles: GalleryFileRecord[] = [];
  let dbCursor = cursor ?? undefined;
  let hasMoreCandidates = true;

  while (validFiles.length <= pageSize && hasMoreCandidates) {
    const remaining = pageSize + 1 - validFiles.length;
    const take = Math.min(Math.max(remaining * 3, pageSize + 1), 120);
    const candidates = await prisma.generatedFile.findMany({
      where,
      orderBy: [{ createdAt: direction }, { id: direction }],
      take,
      ...(dbCursor ? { cursor: { id: dbCursor }, skip: 1 } : {}),
      include: {
        job: { select: { model: true, prompt: true, input: true, tags: true } },
      },
    });

    if (candidates.length === 0) {
      hasMoreCandidates = false;
      break;
    }

    dbCursor = candidates[candidates.length - 1]?.id;
    hasMoreCandidates = candidates.length === take;

    const existingFiles = await Promise.all(
      candidates.map(async (file) =>
        (await storage.exists(file.localPath)) ? file : null
      )
    );

    for (const file of existingFiles) {
      if (file) validFiles.push(file);
    }
  }

  const pageFiles = validFiles.slice(0, pageSize);
  const hasMore = validFiles.length > pageSize || hasMoreCandidates;

  return {
    items: await serializeGalleryItems(pageFiles),
    nextCursor: hasMore ? pageFiles[pageFiles.length - 1]?.id ?? null : null,
    hasMore,
  };
}
