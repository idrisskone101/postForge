import assert from "node:assert/strict";
import {
  INSPIRATION_VIDEO_PAGE_SIZE,
  inspirationVideoFeedPath,
} from "../../src/lib/inspiration/types";
import {
  buildInspirationVideoWhere,
  parseInspirationVideoPageQuery,
} from "../../src/lib/inspiration/video-page";

const feedPath = inspirationVideoFeedPath({
  take: INSPIRATION_VIDEO_PAGE_SIZE,
  cursor: "cursor-2",
});
assert.equal(feedPath, "/api/ugc-inspiration/accounts/feed?take=24&cursor=cursor-2");

const accountPath = inspirationVideoFeedPath({
  accountId: "account-1",
  take: 24,
  cursor: "video-24",
  usage: "unused",
  search: "hook",
  sort: "views",
});
assert.equal(
  accountPath,
  "/api/ugc-inspiration/accounts/account-1/videos?take=24&cursor=video-24&usage=unused&search=hook&sort=views"
);

const parsed = parseInspirationVideoPageQuery(
  new URLSearchParams("take=24&cursor=video-24&usage=used&search=payoff&sort=engagement")
);
assert.equal(parsed.take, 24);
assert.equal(parsed.cursor, "video-24");
assert.equal(parsed.usage, "used");
assert.equal(parsed.search, "payoff");
assert.equal(parsed.sort, "engagement");

const clamped = parseInspirationVideoPageQuery(new URLSearchParams("take=999&usage=nope&sort=nope"));
assert.equal(clamped.take, 60);
assert.equal(clamped.usage, "all");
assert.equal(clamped.sort, "recent");

const unusedWhere = buildInspirationVideoWhere({
  accountId: "account-1",
  usage: "unused",
  search: "",
  usedOriginalUrls: [],
  usedExternalVideoIds: [],
});
assert.deepEqual(unusedWhere, {
  AND: [
    { accountId: "account-1" },
    {},
    {
      rejectedAt: null,
      NOT: { OR: [{ id: "00000000-0000-0000-0000-000000000000" }] },
    },
  ],
});

const usedWhere = buildInspirationVideoWhere({
  usage: "used",
  search: "",
  usedOriginalUrls: ["https://www.tiktok.com/@creator/video/1"],
  usedExternalVideoIds: ["1"],
});
assert.deepEqual(usedWhere, {
  AND: [
    {},
    {},
    {
      rejectedAt: null,
      OR: [
        { originalUrl: { in: ["https://www.tiktok.com/@creator/video/1"] } },
        { externalVideoId: { in: ["1"] } },
      ],
    },
  ],
});
