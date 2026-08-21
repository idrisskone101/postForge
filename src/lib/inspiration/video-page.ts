import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { extractTikTokVideoId, VirloApiError } from "@/lib/inspiration/virlo";
import {
  INSPIRATION_VIDEO_PAGE_SIZE,
  parseInspirationSourceFeedFilter,
  parseInspirationSourceSort,
  type InspirationSourceDecision,
  type InspirationSourceFeedFilter,
  type InspirationSourceSort,
  type InspirationSourceUsage,
  type InspirationSourceUsageCounts,
  type InspirationVideoCard,
  type InspirationVideoPage,
  type InspirationVideoPageQuery,
} from "@/lib/inspiration/types";

const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";
const MAX_PAGE_SIZE = 60;

type CloneSourceRecord = Pick<
  Prisma.TikTokSourceGetPayload<{
    select: { id: true; originalUrl: true; createdAt: true };
  }>,
  "id" | "originalUrl" | "createdAt"
>;

type InspirationVideoRecord = Prisma.InspirationVideoGetPayload<{
  include: { account: true };
}>;

export function parseInspirationVideoPageQuery(
  searchParams: URLSearchParams
): Pick<InspirationVideoPageQuery, "cursor" | "take" | "usage" | "search" | "sort"> {
  const takeParam = Number.parseInt(
    searchParams.get("take") ?? String(INSPIRATION_VIDEO_PAGE_SIZE),
    10
  );

  return {
    cursor: searchParams.get("cursor"),
    take: Number.isFinite(takeParam)
      ? Math.min(Math.max(takeParam, 1), MAX_PAGE_SIZE)
      : INSPIRATION_VIDEO_PAGE_SIZE,
    usage: parseInspirationSourceFeedFilter(searchParams.get("usage") ?? "all"),
    search: searchParams.get("search") ?? "",
    sort: parseInspirationSourceSort(searchParams.get("sort") ?? "recent"),
  };
}

export function buildInspirationVideoWhere(input: {
  accountId?: string | null;
  usage: InspirationSourceFeedFilter;
  search: string;
  usedOriginalUrls: string[];
  usedExternalVideoIds: string[];
}): Prisma.InspirationVideoWhereInput {
  const accountWhere: Prisma.InspirationVideoWhereInput = input.accountId
    ? { accountId: input.accountId }
    : {};
  const query = input.search.trim();
  const searchWhere: Prisma.InspirationVideoWhereInput = query
    ? {
        OR: [
          { caption: { contains: query, mode: "insensitive" } },
          { account: { handleDisplay: { contains: query, mode: "insensitive" } } },
          { account: { displayName: { contains: query, mode: "insensitive" } } },
        ],
      }
    : {};

  return {
    AND: [accountWhere, searchWhere, usageWhere(input)],
  };
}

function usageWhere(input: {
  usage: InspirationSourceFeedFilter;
  usedOriginalUrls: string[];
  usedExternalVideoIds: string[];
}): Prisma.InspirationVideoWhereInput {
  switch (input.usage) {
    case "all":
      return {};
    case "rejected":
      return { rejectedAt: { not: null } };
    case "used":
      return {
        rejectedAt: null,
        OR: usedMatchClauses(input),
      };
    case "unused":
      return {
        rejectedAt: null,
        NOT: { OR: usedMatchClauses(input) },
      };
    default: {
      const _exhaustive: never = input.usage;
      return _exhaustive;
    }
  }
}

function usedMatchClauses(input: {
  usedOriginalUrls: string[];
  usedExternalVideoIds: string[];
}): Prisma.InspirationVideoWhereInput[] {
  const clauses: Prisma.InspirationVideoWhereInput[] = [];
  if (input.usedOriginalUrls.length > 0) {
    clauses.push({ originalUrl: { in: input.usedOriginalUrls } });
  }
  if (input.usedExternalVideoIds.length > 0) {
    clauses.push({ externalVideoId: { in: input.usedExternalVideoIds } });
  }
  if (clauses.length === 0) {
    return [{ id: NO_MATCH_ID }];
  }
  return clauses;
}

function videoOrderBy(
  sort: InspirationSourceSort
): Prisma.InspirationVideoOrderByWithRelationInput[] {
  switch (sort) {
    case "recent":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }];
    case "views":
      return [{ viewCount: "desc" }, { id: "desc" }];
    case "engagement":
      return [
        { likeCount: "desc" },
        { commentCount: "desc" },
        { shareCount: "desc" },
        { id: "desc" },
      ];
    default: {
      const _exhaustive: never = sort;
      return _exhaustive;
    }
  }
}

function serializeSourceUsage(
  source: CloneSourceRecord | null
): InspirationSourceUsage {
  if (!source) {
    return {
      status: "unused",
      sourceId: null,
      usedAt: null,
    };
  }

  return {
    status: "used",
    sourceId: source.id,
    usedAt: source.createdAt.toISOString(),
  };
}

function serializeSourceDecision(
  rejectedAt: Date | null
): InspirationSourceDecision {
  return {
    status: rejectedAt ? "rejected" : "approved",
    rejectedAt: rejectedAt?.toISOString() ?? null,
  };
}

function serializeVideo(
  video: InspirationVideoRecord,
  source: CloneSourceRecord | null
): InspirationVideoCard {
  return {
    id: video.id,
    accountId: video.accountId,
    platform: "tiktok",
    externalVideoId: video.externalVideoId,
    originalUrl: video.originalUrl,
    embedUrl: video.embedUrl,
    thumbnailUrl: video.thumbnailUrl,
    caption: video.caption,
    durationSec: video.durationSec,
    publishedAt: video.publishedAt?.toISOString() ?? null,
    viewCount: video.viewCount,
    likeCount: video.likeCount,
    commentCount: video.commentCount,
    shareCount: video.shareCount,
    lastSeenAt: video.lastSeenAt.toISOString(),
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    creatorHandle: video.account.handleDisplay,
    creatorDisplayName: video.account.displayName,
    creatorAvatarUrl: video.account.avatarUrl,
    creatorProfileUrl: video.account.profileUrl,
    sourceUsage: serializeSourceUsage(source),
    sourceDecision: serializeSourceDecision(video.rejectedAt),
  };
}

async function loadCloneSourceIndex(): Promise<{
  byUrl: Map<string, CloneSourceRecord>;
  byExternalVideoId: Map<string, CloneSourceRecord>;
  originalUrls: string[];
  externalVideoIds: string[];
}> {
  const sources = await prisma.tikTokSource.findMany({
    select: { id: true, originalUrl: true, createdAt: true },
  });
  const byUrl = new Map(
    sources.map((source) => [source.originalUrl, source])
  );
  const byExternalVideoId = new Map<string, CloneSourceRecord>();

  for (const source of sources) {
    const externalVideoId = extractTikTokVideoId(source.originalUrl);
    if (externalVideoId && !byExternalVideoId.has(externalVideoId)) {
      byExternalVideoId.set(externalVideoId, source);
    }
  }

  return {
    byUrl,
    byExternalVideoId,
    originalUrls: Array.from(byUrl.keys()),
    externalVideoIds: Array.from(byExternalVideoId.keys()),
  };
}

function sourceForVideo(
  video: Pick<InspirationVideoRecord, "originalUrl" | "externalVideoId">,
  index: Awaited<ReturnType<typeof loadCloneSourceIndex>>
): CloneSourceRecord | null {
  return (
    index.byUrl.get(video.originalUrl) ??
    index.byExternalVideoId.get(video.externalVideoId) ??
    null
  );
}

async function countUsage(input: {
  accountId?: string | null;
  usedOriginalUrls: string[];
  usedExternalVideoIds: string[];
}): Promise<InspirationSourceUsageCounts> {
  const base = { accountId: input.accountId, search: "" };
  const [all, unused, used, rejected] = await Promise.all([
    prisma.inspirationVideo.count({
      where: buildInspirationVideoWhere({
        ...base,
        usage: "all",
        usedOriginalUrls: input.usedOriginalUrls,
        usedExternalVideoIds: input.usedExternalVideoIds,
      }),
    }),
    prisma.inspirationVideo.count({
      where: buildInspirationVideoWhere({
        ...base,
        usage: "unused",
        usedOriginalUrls: input.usedOriginalUrls,
        usedExternalVideoIds: input.usedExternalVideoIds,
      }),
    }),
    prisma.inspirationVideo.count({
      where: buildInspirationVideoWhere({
        ...base,
        usage: "used",
        usedOriginalUrls: input.usedOriginalUrls,
        usedExternalVideoIds: input.usedExternalVideoIds,
      }),
    }),
    prisma.inspirationVideo.count({
      where: buildInspirationVideoWhere({
        ...base,
        usage: "rejected",
        usedOriginalUrls: input.usedOriginalUrls,
        usedExternalVideoIds: input.usedExternalVideoIds,
      }),
    }),
  ]);

  return { all, unused, used, rejected };
}

export async function listInspirationVideos(
  input: InspirationVideoPageQuery = {}
): Promise<InspirationVideoPage> {
  const take = Math.min(
    Math.max(input.take ?? INSPIRATION_VIDEO_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const usage = input.usage ?? "all";
  const sort = input.sort ?? "recent";
  const search = input.search ?? "";
  const cursor = input.cursor ?? null;
  const accountId = input.accountId ?? null;

  if (accountId) {
    const account = await prisma.inspirationAccount.findUnique({
      where: { id: accountId },
      select: { id: true },
    });
    if (!account) {
      throw new VirloApiError("Tracked creator not found.", 404);
    }
  }

  if (cursor) {
    const cursorRow = await prisma.inspirationVideo.findUnique({
      where: { id: cursor },
      select: { id: true },
    });
    if (!cursorRow) {
      throw new VirloApiError("Invalid video cursor.", 400);
    }
  }

  const sourceIndex = await loadCloneSourceIndex();
  const where = buildInspirationVideoWhere({
    accountId,
    usage,
    search,
    usedOriginalUrls: sourceIndex.originalUrls,
    usedExternalVideoIds: sourceIndex.externalVideoIds,
  });
  const orderBy = videoOrderBy(sort);

  const [rows, total, usageCounts] = await Promise.all([
    prisma.inspirationVideo.findMany({
      where,
      orderBy,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { account: true },
    }),
    prisma.inspirationVideo.count({ where }),
    countUsage({
      accountId,
      usedOriginalUrls: sourceIndex.originalUrls,
      usedExternalVideoIds: sourceIndex.externalVideoIds,
    }),
  ]);

  const hasMore = rows.length > take;
  const pageRows = hasMore ? rows.slice(0, take) : rows;

  return {
    items: pageRows.map((video) =>
      serializeVideo(video, sourceForVideo(video, sourceIndex))
    ),
    nextCursor: hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null,
    hasMore,
    total,
    usageCounts,
  };
}
