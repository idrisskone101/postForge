import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type {
  InspirationVideoCard,
  TrackedInspirationAccount,
} from "@/lib/inspiration/types";
import {
  buildTikTokProfileUrl,
  deriveTikTokEmbedUrl,
  extractTikTokVideoId,
  lookupTikTokCreator,
  normalizeTikTokHandle,
  VirloApiError,
  type VirloCreatorLookupResult,
} from "@/lib/inspiration/virlo";

const INSPIRATION_STALE_MS = 12 * 60 * 60 * 1000;

const inspirationAccountInclude = {
  videos: {
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  },
} satisfies Prisma.InspirationAccountInclude;

type InspirationAccountRecord = Prisma.InspirationAccountGetPayload<{
  include: typeof inspirationAccountInclude;
}>;

interface MappedVideoInput {
  externalVideoId: string;
  originalUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  durationSec: number | null;
  publishedAt: Date | null;
  viewCount: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  lastSeenAt: Date;
  sourcePayload: Prisma.InputJsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1_000_000_000_000 ? value : value * 1_000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return readDate(numeric);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const str = readString(value);
    if (str) return str;
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const num = readNumber(value);
    if (num !== null) return num;
  }
  return null;
}

function firstDate(...values: unknown[]): Date | null {
  for (const value of values) {
    const date = readDate(value);
    if (date) return date;
  }
  return null;
}

function findFirstUrlLikeString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findFirstUrlLikeString(item);
      if (match) return match;
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const nested of Object.values(value)) {
    const match = findFirstUrlLikeString(nested);
    if (match) return match;
  }

  return null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function getDisplayName(result: VirloCreatorLookupResult): string | null {
  const profile = isRecord(result.profile) ? result.profile : null;
  return firstString(
    result.display_name,
    result.name,
    profile?.display_name,
    profile?.name,
    profile?.nickname
  );
}

function getAvatarUrl(result: VirloCreatorLookupResult): string | null {
  const profile = isRecord(result.profile) ? result.profile : null;
  return firstString(result.avatar_url, profile?.avatar_url, profile?.avatarUrl);
}

function getProfileUrl(result: VirloCreatorLookupResult, handle: string): string {
  const profile = isRecord(result.profile) ? result.profile : null;
  return (
    firstString(result.url, profile?.url, profile?.profile_url, profile?.profileUrl) ??
    buildTikTokProfileUrl(handle)
  );
}

function mapVirloVideo(
  rawVideo: Record<string, unknown>,
  seenAt: Date
): MappedVideoInput | null {
  const originalUrl =
    firstString(
      rawVideo.url,
      rawVideo.share_url,
      rawVideo.shareUrl,
      rawVideo.permalink
    ) ?? findFirstUrlLikeString(rawVideo);
  const externalVideoId =
    firstString(rawVideo.id, rawVideo.video_id, rawVideo.videoId) ??
    extractTikTokVideoId(originalUrl);

  if (!externalVideoId || !originalUrl) {
    return null;
  }

  const caption = firstString(
    rawVideo.title,
    rawVideo.description,
    rawVideo.video_description,
    rawVideo.caption
  );
  const thumbnailUrl = firstString(
    rawVideo.thumbnail_url,
    rawVideo.thumbnail,
    rawVideo.cover_url,
    rawVideo.cover,
    rawVideo.coverUrl
  );
  const embedUrl =
    firstString(rawVideo.embed_link, rawVideo.embed_url, rawVideo.embedUrl) ??
    deriveTikTokEmbedUrl(externalVideoId);

  return {
    externalVideoId,
    originalUrl,
    embedUrl,
    thumbnailUrl,
    caption,
    durationSec: firstNumber(
      rawVideo.duration,
      rawVideo.duration_sec,
      rawVideo.duration_seconds
    ),
    publishedAt: firstDate(
      rawVideo.publishDate,
      rawVideo.published_at,
      rawVideo.create_time,
      rawVideo.created_at
    ),
    viewCount: firstNumber(rawVideo.views, rawVideo.view_count, rawVideo.play_count),
    likeCount: firstNumber(rawVideo.likes, rawVideo.like_count, rawVideo.digg_count),
    commentCount: firstNumber(rawVideo.comments, rawVideo.comment_count),
    shareCount: firstNumber(rawVideo.shares, rawVideo.share_count),
    lastSeenAt: seenAt,
    sourcePayload: toJsonValue(rawVideo),
  };
}

function isAccountStale(lastSyncedAt: Date | null): boolean {
  if (!lastSyncedAt) return true;
  return Date.now() - lastSyncedAt.getTime() > INSPIRATION_STALE_MS;
}

function serializeVideo(
  account: InspirationAccountRecord,
  video: InspirationAccountRecord["videos"][number]
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
    creatorHandle: account.handleDisplay,
    creatorDisplayName: account.displayName,
    creatorAvatarUrl: account.avatarUrl,
    creatorProfileUrl: account.profileUrl,
  };
}

function serializeAccount(account: InspirationAccountRecord): TrackedInspirationAccount {
  return {
    id: account.id,
    platform: "tiktok",
    handleNormalized: account.handleNormalized,
    handleDisplay: account.handleDisplay,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    profileUrl: account.profileUrl,
    syncStatus: account.syncStatus,
    lastSyncAttemptAt: account.lastSyncAttemptAt?.toISOString() ?? null,
    lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
    lastSyncError: account.lastSyncError,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    isStale: isAccountStale(account.lastSyncedAt),
    videos: account.videos.map((video) => serializeVideo(account, video)),
  };
}

async function getTrackedAccountRecord(accountId: string): Promise<InspirationAccountRecord | null> {
  return prisma.inspirationAccount.findUnique({
    where: { id: accountId },
    include: inspirationAccountInclude,
  });
}

export async function listTrackedInspirationAccounts(): Promise<TrackedInspirationAccount[]> {
  const accounts = await prisma.inspirationAccount.findMany({
    include: inspirationAccountInclude,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return accounts.map(serializeAccount);
}

export async function createTrackedInspirationAccount(
  handleInput: string
): Promise<TrackedInspirationAccount> {
  const handleNormalized = normalizeTikTokHandle(handleInput);

  const existing = await prisma.inspirationAccount.findUnique({
    where: {
      platform_handleNormalized: {
        platform: "tiktok",
        handleNormalized,
      },
    },
    include: inspirationAccountInclude,
  });

  if (existing) {
    return serializeAccount(existing);
  }

  const account = await prisma.inspirationAccount.create({
    data: {
      platform: "tiktok",
      handleNormalized,
      handleDisplay: `@${handleNormalized}`,
      profileUrl: buildTikTokProfileUrl(handleNormalized),
      syncStatus: "idle",
    },
    include: inspirationAccountInclude,
  });

  return serializeAccount(account);
}

export async function syncTrackedInspirationAccount(
  accountId: string
): Promise<TrackedInspirationAccount> {
  const account = await prisma.inspirationAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new VirloApiError("Tracked creator not found.", 404);
  }

  const syncStartedAt = new Date();
  await prisma.inspirationAccount.update({
    where: { id: accountId },
    data: {
      syncStatus: "syncing",
      lastSyncAttemptAt: syncStartedAt,
      lastSyncError: null,
    },
  });

  try {
    const result = await lookupTikTokCreator(account.handleNormalized);
    const username = normalizeTikTokHandle(
      firstString(result.username, account.handleNormalized) ?? account.handleNormalized
    );
    const rawVideos = Array.isArray(result.videos) ? result.videos : [];
    const videos = rawVideos
      .filter(isRecord)
      .map((video) => mapVirloVideo(video, syncStartedAt))
      .filter((video): video is MappedVideoInput => video !== null);

    await prisma.$transaction(async (tx) => {
      await tx.inspirationAccount.update({
        where: { id: accountId },
        data: {
          platform: "tiktok",
          handleNormalized: username,
          handleDisplay: `@${username}`,
          displayName: getDisplayName(result),
          avatarUrl: getAvatarUrl(result),
          profileUrl: getProfileUrl(result, username),
          syncStatus: "ready",
          lastSyncedAt: syncStartedAt,
          lastSyncError: null,
        },
      });

      for (const video of videos) {
        await tx.inspirationVideo.upsert({
          where: {
            platform_externalVideoId: {
              platform: "tiktok",
              externalVideoId: video.externalVideoId,
            },
          },
          update: {
            accountId,
            originalUrl: video.originalUrl,
            embedUrl: video.embedUrl,
            thumbnailUrl: video.thumbnailUrl,
            caption: video.caption,
            durationSec: video.durationSec,
            publishedAt: video.publishedAt,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
            shareCount: video.shareCount,
            lastSeenAt: video.lastSeenAt,
            sourcePayload: video.sourcePayload,
          },
          create: {
            accountId,
            platform: "tiktok",
            externalVideoId: video.externalVideoId,
            originalUrl: video.originalUrl,
            embedUrl: video.embedUrl,
            thumbnailUrl: video.thumbnailUrl,
            caption: video.caption,
            durationSec: video.durationSec,
            publishedAt: video.publishedAt,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
            shareCount: video.shareCount,
            lastSeenAt: video.lastSeenAt,
            sourcePayload: video.sourcePayload,
          },
        });
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh creator.";

    await prisma.inspirationAccount.update({
      where: { id: accountId },
      data: {
        syncStatus: "error",
        lastSyncError: message,
      },
    });

    throw error;
  }

  const updated = await getTrackedAccountRecord(accountId);
  if (!updated) {
    throw new VirloApiError("Tracked creator not found after sync.", 404);
  }

  return serializeAccount(updated);
}

export async function deleteTrackedInspirationAccount(accountId: string): Promise<void> {
  const existing = await prisma.inspirationAccount.findUnique({
    where: { id: accountId },
    select: { id: true },
  });

  if (!existing) {
    throw new VirloApiError("Tracked creator not found.", 404);
  }

  await prisma.inspirationAccount.delete({ where: { id: accountId } });
}
