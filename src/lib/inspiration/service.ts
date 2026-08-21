import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  clampInspirationAccountTake,
  type InspirationAccountPage,
  type InspirationAccountPageQuery,
  type InspirationSourceDecision,
  type SetInspirationRejectionResult,
  type TrackedInspirationAccount,
} from "@/lib/inspiration/types";
import { mapVirloCreatorLookup } from "@/lib/inspiration/virlo-payload";
import {
  buildTikTokProfileUrl,
  lookupTikTokCreator,
  normalizeTikTokHandle,
  VirloApiError,
} from "@/lib/inspiration/virlo";

const INSPIRATION_STALE_MS = 12 * 60 * 60 * 1000;

const inspirationAccountListInclude = {
  _count: { select: { videos: true } },
} satisfies Prisma.InspirationAccountInclude;

type InspirationAccountListRecord = Prisma.InspirationAccountGetPayload<{
  include: typeof inspirationAccountListInclude;
}>;

function isAccountStale(lastSyncedAt: Date | null): boolean {
  if (!lastSyncedAt) return true;
  return Date.now() - lastSyncedAt.getTime() > INSPIRATION_STALE_MS;
}

function serializeSourceDecision(rejectedAt: Date | null): InspirationSourceDecision {
  return {
    status: rejectedAt ? "rejected" : "approved",
    rejectedAt: rejectedAt?.toISOString() ?? null,
  };
}

function serializeAccount(
  account: InspirationAccountListRecord
): TrackedInspirationAccount {
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
    videoCount: account._count.videos,
  };
}

async function getTrackedAccountListRecord(
  accountId: string
): Promise<InspirationAccountListRecord | null> {
  return prisma.inspirationAccount.findUnique({
    where: { id: accountId },
    include: inspirationAccountListInclude,
  });
}

export async function listTrackedInspirationAccounts(
  input: InspirationAccountPageQuery = {}
): Promise<InspirationAccountPage> {
  const take = clampInspirationAccountTake(input.take);
  const cursor = input.cursor?.trim() ? input.cursor : undefined;

  const accounts = await prisma.inspirationAccount.findMany({
    include: inspirationAccountListInclude,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return {
    items: accounts.map((account) => serializeAccount(account)),
    nextCursor:
      accounts.length === take ? accounts[accounts.length - 1]?.id ?? null : null,
  };
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
    include: inspirationAccountListInclude,
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
    include: inspirationAccountListInclude,
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
    const mapped = mapVirloCreatorLookup(
      result,
      account.handleNormalized,
      syncStartedAt
    );

    await prisma.$transaction(async (tx) => {
      await tx.inspirationAccount.update({
        where: { id: accountId },
        data: {
          platform: "tiktok",
          handleNormalized: mapped.username,
          handleDisplay: `@${mapped.username}`,
          displayName: mapped.displayName,
          avatarUrl: mapped.avatarUrl,
          profileUrl: mapped.profileUrl,
          syncStatus: "ready",
          lastSyncedAt: syncStartedAt,
          lastSyncError: null,
        },
      });

      for (const video of mapped.videos) {
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

  const updated = await getTrackedAccountListRecord(accountId);
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

export async function setInspirationVideoRejection(
  videoId: string,
  rejected: boolean
): Promise<SetInspirationRejectionResult> {
  const existing = await prisma.inspirationVideo.findUnique({
    where: { id: videoId },
    select: { id: true },
  });

  if (!existing) {
    throw new VirloApiError("Inspiration video not found.", 404);
  }

  const updated = await prisma.inspirationVideo.update({
    where: { id: videoId },
    data: {
      rejectedAt: rejected ? new Date() : null,
    },
    select: {
      id: true,
      rejectedAt: true,
    },
  });

  return {
    videoId: updated.id,
    sourceDecision: serializeSourceDecision(updated.rejectedAt),
  };
}
