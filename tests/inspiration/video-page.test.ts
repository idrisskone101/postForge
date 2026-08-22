import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clampInspirationAccountTake,
  INSPIRATION_ACCOUNT_PAGE_MAX,
  INSPIRATION_ACCOUNT_PAGE_SIZE,
  INSPIRATION_VIDEO_PAGE_SIZE,
  inspirationAccountListPath,
  inspirationVideoFeedPath,
  parseInspirationAccountPageQuery,
} from "../../src/lib/inspiration/types";
import {
  buildInspirationVideoWhere,
  parseInspirationVideoPageQuery,
} from "../../src/lib/inspiration/video-page";

const videoPageLib = readFileSync(
  new URL("../../src/lib/inspiration/video-page.ts", import.meta.url),
  "utf8"
);

const accountsRoute = readFileSync(
  new URL("../../src/app/api/ugc-inspiration/accounts/route.ts", import.meta.url),
  "utf8"
);
const pageSource = readFileSync(
  new URL("../../src/app/ugc-inspiration/page.tsx", import.meta.url),
  "utf8"
);
const workspaceSource = readFileSync(
  new URL("../../src/app/ugc-inspiration/use-inspiration-workspace.ts", import.meta.url),
  "utf8"
);
const accountListHook = readFileSync(
  new URL("../../src/app/ugc-inspiration/use-inspiration-account-list.ts", import.meta.url),
  "utf8"
);
const mutationsSource = readFileSync(
  new URL("../../src/app/ugc-inspiration/inspiration-mutations.ts", import.meta.url),
  "utf8"
);
const serviceSource = readFileSync(
  new URL("../../src/lib/inspiration/service.ts", import.meta.url),
  "utf8"
);

assert.match(accountsRoute, /parseInspirationAccountPageQuery/);
assert.match(accountsRoute, /NextResponse\.json\(page\)/);
assert.doesNotMatch(accountsRoute, /NextResponse\.json\(accounts\)/);
assert.match(serviceSource, /InspirationAccountPage/);
assert.match(serviceSource, /nextCursor:/);
assert.match(serviceSource, /clampInspirationAccountTake/);
assert.doesNotMatch(
  serviceSource,
  /export async function listTrackedInspirationAccounts\(\): Promise<TrackedInspirationAccount\[\]>/
);
assert.match(pageSource, /initialAccountPage/);
assert.match(pageSource, /listTrackedInspirationAccounts\(\)/);
assert.doesNotMatch(pageSource, /initialAccounts=/);
assert.match(workspaceSource, /useInspirationAccountList/);
assert.match(workspaceSource, /handleLoadMoreAccounts/);
const useInClone = workspaceSource.slice(
  workspaceSource.indexOf("function handleUseInClone"),
  workspaceSource.indexOf("function handleSetVideoRejection")
);
assert.match(useInClone, /buildCloneSourceUrlHandoffHref\(video\.originalUrl\)/);
assert.doesNotMatch(useInClone, /postInspirationVideoUse/);
assert.equal(
  (workspaceSource.match(/useEffect\(/g) ?? []).length,
  3,
  "inspiration workspace keeps debounce, embed timeout, and copy toast effects only"
);
assert.match(workspaceSource, /setActiveFilterAndReload/);
assert.match(workspaceSource, /setSourceFeedFilterAndReload/);
assert.match(workspaceSource, /setSourceSortAndReload/);
assert.doesNotMatch(
  workspaceSource,
  /if \(selectedVideo\) return;\s*setSelectedVideoId\(null\)/
);
assert.match(
  workspaceSource,
  /selectedVideoId === result\.videoId/
);
assert.match(accountListHook, /fetchInspirationAccountPage\(\{ cursor: accountCursor \}\)/);
assert.match(mutationsSource, /fetchInspirationAccountPage/);
assert.doesNotMatch(mutationsSource, /apiGet<TrackedInspirationAccount\[\]>/);

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

assert.equal(
  inspirationAccountListPath(),
  "/api/ugc-inspiration/accounts?take=50"
);
assert.equal(
  inspirationAccountListPath({ cursor: "account-50" }),
  "/api/ugc-inspiration/accounts?take=50&cursor=account-50"
);

const parsedAccounts = parseInspirationAccountPageQuery(new URLSearchParams());
assert.equal(parsedAccounts.take, INSPIRATION_ACCOUNT_PAGE_SIZE);
assert.equal(parsedAccounts.cursor, null);

const clampedAccounts = parseInspirationAccountPageQuery(
  new URLSearchParams("take=500&cursor=account-2")
);
assert.equal(clampedAccounts.take, INSPIRATION_ACCOUNT_PAGE_MAX);
assert.equal(clampedAccounts.cursor, "account-2");
assert.equal(clampInspirationAccountTake(undefined), 50);
assert.equal(clampInspirationAccountTake(0), 1);
assert.equal(clampInspirationAccountTake(500), 100);

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

assert.match(videoPageLib, /originalUrl: \{ in: originalUrls \}/);
assert.match(
  videoPageLib,
  /originalUrl: \{ contains: `\/video\/\$\{id\}` \}/
);
assert.doesNotMatch(
  videoPageLib,
  /prisma\.tikTokSource\.findMany\(\{\s*select:/
);

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
