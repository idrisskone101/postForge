import "dotenv/config";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../../src/lib/db";
import { listTrackedInspirationAccounts } from "../../src/lib/inspiration/service";
import { listInspirationVideos } from "../../src/lib/inspiration/video-page";

async function run() {
  const stamp = `${Date.now()}`;
  const handle = `inspdto${stamp}`.slice(0, 24);
  const accountId = `insp-dto-account-${stamp}`;
  const sourceId = `insp-dto-source-${stamp}`;
  const videoIds = Array.from(
    { length: 30 },
    (_, index) => `insp-dto-video-${stamp}-${index}`
  );
  const pagingIds = [0, 1, 2].map((index) => `insp-dto-page-${stamp}-${index}`);

  try {
    await prisma.inspirationAccount.create({
      data: {
        id: accountId,
        platform: "tiktok",
        handleNormalized: handle,
        handleDisplay: `@${handle}`,
        displayName: "DTO Fixture",
        profileUrl: `https://www.tiktok.com/@${handle}`,
        syncStatus: "ready",
        lastSyncedAt: new Date("2026-06-12T12:00:00Z"),
        videos: {
          create: videoIds.map((id, index) => ({
            id,
            platform: "tiktok",
            externalVideoId: `${stamp}${String(index).padStart(6, "0")}`,
            originalUrl: `https://www.tiktok.com/@${handle}/video/${stamp}${index}`,
            caption: index === 0 ? "first-page hook" : `source ${index}`,
            publishedAt: new Date(Date.UTC(2026, 5, 30 - index)),
            viewCount: 1000 - index,
            likeCount: 10,
            commentCount: 1,
            shareCount: 1,
            lastSeenAt: new Date("2026-06-12T12:00:00Z"),
            sourcePayload: {},
            rejectedAt: index === 29 ? new Date("2026-06-14T12:00:00Z") : null,
          })),
        },
      },
    });

    await prisma.tikTokSource.create({
      data: {
        id: sourceId,
        label: "dto fixture",
        originalUrl: `https://www.tiktok.com/@${handle}/video/${stamp}1`,
        filename: "dto-fixture.mp4",
        durationSec: 8,
        width: 1080,
        height: 1920,
      },
    });

    const listed = await listTrackedInspirationAccounts();
    assert.equal(Array.isArray(listed), false);
    assert.ok(Array.isArray(listed.items));
    assert.ok(listed.items.length <= 50);
    assert.ok(listed.nextCursor === null || typeof listed.nextCursor === "string");
    let listedAccount = listed.items.find((item) => item.id === accountId);
    let listedCursor = listed.nextCursor;
    while (!listedAccount && listedCursor) {
      const nextListed = await listTrackedInspirationAccounts({
        cursor: listedCursor,
      });
      listedAccount = nextListed.items.find((item) => item.id === accountId);
      listedCursor = nextListed.nextCursor;
    }
    assert.ok(listedAccount);
    assert.equal(listedAccount.videoCount, 30);
    assert.equal(
      Object.prototype.hasOwnProperty.call(listedAccount, "videos"),
      false
    );

    await Promise.all(
      pagingIds.map((id, index) =>
        prisma.inspirationAccount.create({
          data: {
            id,
            platform: "tiktok",
            handleNormalized: `insppg${stamp}${index}`.slice(0, 24),
            handleDisplay: `@insppg${stamp}${index}`.slice(0, 25),
            displayName: `Page ${index}`,
            profileUrl: `https://www.tiktok.com/@insppg${stamp}${index}`,
            syncStatus: "ready",
            createdAt: new Date(`2099-12-31T00:00:0${3 - index}.000Z`),
            updatedAt: new Date(`2099-12-31T00:00:0${3 - index}.000Z`),
          },
        })
      )
    );

    const firstPage = await listTrackedInspirationAccounts({ take: 2 });
    assert.equal(Array.isArray(firstPage), false);
    assert.equal(firstPage.items.length, 2);
    assert.equal(firstPage.items[0]?.id, pagingIds[0]);
    assert.equal(firstPage.items[1]?.id, pagingIds[1]);
    assert.equal(firstPage.nextCursor, pagingIds[1]);
    assert.equal(
      Object.prototype.hasOwnProperty.call(firstPage.items[0], "videos"),
      false
    );

    const secondPage = await listTrackedInspirationAccounts({
      take: 2,
      cursor: firstPage.nextCursor,
    });
    assert.equal(secondPage.items[0]?.id, pagingIds[2]);
    assert.ok(
      secondPage.nextCursor === null || typeof secondPage.nextCursor === "string"
    );
    if (secondPage.items.length < 2) {
      assert.equal(secondPage.nextCursor, null);
    }

    const uncapped = await listTrackedInspirationAccounts({ take: 500 });
    assert.ok(uncapped.items.length <= 100);

    const { GET } = await import("../../src/app/api/ugc-inspiration/accounts/route");
    const firstResponse = await GET(
      new NextRequest("http://localhost/api/ugc-inspiration/accounts?take=2")
    );
    const firstBody = (await firstResponse.json()) as {
      items: Array<{ id: string; videos?: unknown }>;
      nextCursor: string | null;
    };
    assert.equal(Array.isArray(firstBody), false);
    assert.equal(firstBody.items.length, 2);
    assert.equal(firstBody.nextCursor, pagingIds[1]);
    assert.equal(
      Object.prototype.hasOwnProperty.call(firstBody.items[0], "videos"),
      false
    );

    const defaultResponse = await GET(
      new NextRequest("http://localhost/api/ugc-inspiration/accounts")
    );
    const defaultBody = (await defaultResponse.json()) as {
      items: Array<{ id: string }>;
      nextCursor: string | null;
    };
    assert.equal(Array.isArray(defaultBody), false);
    assert.ok(defaultBody.items.length <= 50);
    assert.ok(
      defaultBody.nextCursor === null || typeof defaultBody.nextCursor === "string"
    );

    const firstVideoPage = await listInspirationVideos({
      accountId,
      take: 24,
    });
    assert.equal(firstVideoPage.items.length, 24);
    assert.equal(firstVideoPage.hasMore, true);
    assert.ok(firstVideoPage.nextCursor);
    assert.equal(firstVideoPage.total, 30);
    assert.equal(firstVideoPage.usageCounts.all, 30);
    assert.equal(firstVideoPage.items[0]?.id, videoIds[0]);
    assert.equal(
      firstVideoPage.items.some((item) => item.id === videoIds[24]),
      false
    );

    const secondVideoPage = await listInspirationVideos({
      accountId,
      take: 24,
      cursor: firstVideoPage.nextCursor,
    });
    assert.equal(secondVideoPage.items.length, 6);
    assert.equal(secondVideoPage.hasMore, false);
    assert.equal(secondVideoPage.nextCursor, null);
    assert.equal(secondVideoPage.items[0]?.id, videoIds[24]);

    const unusedPage = await listInspirationVideos({
      accountId,
      take: 24,
      usage: "unused",
    });
    assert.equal(unusedPage.usageCounts.rejected, 1);
    assert.equal(unusedPage.usageCounts.used, 1);
    assert.ok(unusedPage.total < 30);
  } finally {
    await prisma.tikTokSource.deleteMany({ where: { id: sourceId } });
    await prisma.inspirationAccount.deleteMany({
      where: { id: { in: [accountId, ...pagingIds] } },
    });
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
