import "dotenv/config";
import assert from "node:assert/strict";
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
    const listedAccount = listed.find((item) => item.id === accountId);
    assert.ok(listedAccount);
    assert.equal(listedAccount.videoCount, 30);
    assert.equal(
      Object.prototype.hasOwnProperty.call(listedAccount, "videos"),
      false
    );

    const firstPage = await listInspirationVideos({
      accountId,
      take: 24,
    });
    assert.equal(firstPage.items.length, 24);
    assert.equal(firstPage.hasMore, true);
    assert.ok(firstPage.nextCursor);
    assert.equal(firstPage.total, 30);
    assert.equal(firstPage.usageCounts.all, 30);
    assert.equal(firstPage.items[0]?.id, videoIds[0]);
    assert.equal(
      firstPage.items.some((item) => item.id === videoIds[24]),
      false
    );

    const secondPage = await listInspirationVideos({
      accountId,
      take: 24,
      cursor: firstPage.nextCursor,
    });
    assert.equal(secondPage.items.length, 6);
    assert.equal(secondPage.hasMore, false);
    assert.equal(secondPage.nextCursor, null);
    assert.equal(secondPage.items[0]?.id, videoIds[24]);

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
    await prisma.inspirationAccount.deleteMany({ where: { id: accountId } });
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
