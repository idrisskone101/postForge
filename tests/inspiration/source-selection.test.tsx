import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  InspirationPageClient,
} from "../../src/app/ugc-inspiration/inspiration-page-client";
import { InspirationHeaderControls } from "../../src/app/ugc-inspiration/inspiration-header-controls";
import { filterVideosBySourceUsage } from "../../src/app/ugc-inspiration/inspiration-models";
import {
  emptyInspirationAccountPage,
  emptyInspirationVideoPage,
  INSPIRATION_VIDEO_PAGE_SIZE,
  inspirationVideoFeedPath,
  type InspirationVideoCard,
  type InspirationVideoPage,
  type TrackedInspirationAccount,
} from "../../src/lib/inspiration/types";

const videos: InspirationVideoCard[] = [
  {
    id: "video-1",
    accountId: "account-1",
    platform: "tiktok",
    externalVideoId: "7350000000000000000",
    originalUrl: "https://www.tiktok.com/@creator/video/7350000000000000000",
    embedUrl: null,
    thumbnailUrl: null,
    caption: "Three-second hook with a clear first-frame payoff.",
    durationSec: 13,
    publishedAt: "2026-06-12T12:00:00Z",
    viewCount: 125000,
    likeCount: 18000,
    commentCount: 230,
    shareCount: 92,
    lastSeenAt: "2026-06-12T12:00:00Z",
    createdAt: "2026-06-12T12:00:00Z",
    updatedAt: "2026-06-12T12:00:00Z",
    creatorHandle: "@creator",
    creatorDisplayName: "Creator",
    creatorAvatarUrl: null,
    creatorProfileUrl: "https://www.tiktok.com/@creator",
    sourceUsage: {
      status: "unused",
      sourceId: null,
      usedAt: null,
    },
    sourceDecision: {
      status: "approved",
      rejectedAt: null,
    },
  },
  {
    id: "video-2",
    accountId: "account-1",
    platform: "tiktok",
    externalVideoId: "7350000000000000001",
    originalUrl: "https://www.tiktok.com/@creator/video/7350000000000000001",
    embedUrl: null,
    thumbnailUrl: null,
    caption: "Already used source with a strong visual payoff.",
    durationSec: 9,
    publishedAt: "2026-06-11T12:00:00Z",
    viewCount: 98000,
    likeCount: 12000,
    commentCount: 180,
    shareCount: 64,
    lastSeenAt: "2026-06-12T12:00:00Z",
    createdAt: "2026-06-12T12:00:00Z",
    updatedAt: "2026-06-12T12:00:00Z",
    creatorHandle: "@creator",
    creatorDisplayName: "Creator",
    creatorAvatarUrl: null,
    creatorProfileUrl: "https://www.tiktok.com/@creator",
    sourceUsage: {
      status: "used",
      sourceId: "source-1",
      usedAt: "2026-06-13T12:00:00Z",
    },
    sourceDecision: {
      status: "approved",
      rejectedAt: null,
    },
  },
  {
    id: "video-3",
    accountId: "account-1",
    platform: "tiktok",
    externalVideoId: "7350000000000000002",
    originalUrl: "https://www.tiktok.com/@creator/video/7350000000000000002",
    embedUrl: null,
    thumbnailUrl: null,
    caption: "Rejected source that should stay out of the fresh pile.",
    durationSec: 11,
    publishedAt: "2026-06-10T12:00:00Z",
    viewCount: 54000,
    likeCount: 6000,
    commentCount: 90,
    shareCount: 21,
    lastSeenAt: "2026-06-12T12:00:00Z",
    createdAt: "2026-06-12T12:00:00Z",
    updatedAt: "2026-06-12T12:00:00Z",
    creatorHandle: "@creator",
    creatorDisplayName: "Creator",
    creatorAvatarUrl: null,
    creatorProfileUrl: "https://www.tiktok.com/@creator",
    sourceUsage: {
      status: "unused",
      sourceId: null,
      usedAt: null,
    },
    sourceDecision: {
      status: "rejected",
      rejectedAt: "2026-06-14T12:00:00Z",
    },
  },
];

const accounts: TrackedInspirationAccount[] = [
  {
    id: "account-1",
    platform: "tiktok",
    handleNormalized: "creator",
    handleDisplay: "@creator",
    displayName: "Creator",
    avatarUrl: "https://cdn.example.com/creator-avatar.jpg",
    profileUrl: "https://www.tiktok.com/@creator",
    syncStatus: "ready",
    lastSyncAttemptAt: "2026-06-12T12:00:00Z",
    lastSyncedAt: "2026-06-12T12:00:00Z",
    lastSyncError: null,
    createdAt: "2026-06-12T12:00:00Z",
    updatedAt: "2026-06-12T12:00:00Z",
    isStale: false,
    videoCount: 3,
  },
];

const initialVideoPage: InspirationVideoPage = {
  items: videos,
  nextCursor: null,
  hasMore: false,
  total: 3,
  usageCounts: {
    all: 3,
    unused: 1,
    used: 1,
    rejected: 1,
  },
};

const pagedVideos = Array.from({ length: INSPIRATION_VIDEO_PAGE_SIZE }, (_, index) => ({
  ...videos[0],
  id: `paged-video-${index}`,
  externalVideoId: `7350000000000000${String(index).padStart(3, "0")}`,
  originalUrl: `https://www.tiktok.com/@creator/video/paged-${index}`,
  publishedAt: new Date(Date.UTC(2026, 5, 30 - index)).toISOString(),
}));
const pagedCursor = pagedVideos[pagedVideos.length - 1]?.id ?? "paged-video-23";
const manySourcesPage: InspirationVideoPage = {
  items: pagedVideos,
  nextCursor: pagedCursor,
  hasMore: true,
  total: 30,
  usageCounts: {
    all: 30,
    unused: 30,
    used: 0,
    rejected: 0,
  },
};

assert.equal(
  JSON.parse(JSON.stringify(accounts[0])).videos,
  undefined,
  "account list DTO must not embed videos"
);

const markup = renderToStaticMarkup(
  <InspirationPageClient
    initialAccountPage={{ items: accounts, nextCursor: null }}
    initialVideoPage={initialVideoPage}
  />
);
const headerMarkup = renderToStaticMarkup(
  <InspirationHeaderControls
    handleInput=""
    isAddingAccount={false}
    onHandleInputChange={() => {}}
    onTrackAccount={() => {}}
  />
);
const emptyMarkup = renderToStaticMarkup(
  <InspirationPageClient
    initialAccountPage={emptyInspirationAccountPage()}
    initialVideoPage={emptyInspirationVideoPage()}
  />
);
const manySourcesMarkup = renderToStaticMarkup(
  <InspirationPageClient
    initialAccountPage={{
      items: [{ ...accounts[0], videoCount: 30 }],
      nextCursor: null,
    }}
    initialVideoPage={manySourcesPage}
  />
);
const manyAccountsMarkup = renderToStaticMarkup(
  <InspirationPageClient
    initialAccountPage={{ items: accounts, nextCursor: "account-50" }}
    initialVideoPage={initialVideoPage}
  />
);

assert.match(headerMarkup, /Source Selection/);
assert.match(headerMarkup, /Compare creator posts/);
assert.match(headerMarkup, /Track Creator/);
assert.match(headerMarkup, /lg:w-\[31rem\]/);
assert.doesNotMatch(markup, /Source Selection/);
assert.match(markup, /Preview source from @creator/);
assert.match(markup, /Use in Clone/);
assert.match(markup, /Tracked creators/);
assert.match(markup, /Creator Feed/);
assert.match(markup, /All tracked creator videos/);
assert.doesNotMatch(markup, /Find the source worth rebuilding/);
assert.match(markup, /Refresh all/);
assert.match(markup, /Source library/);
assert.match(markup, /Search source library/);
assert.match(markup, /Sort source library/);
assert.match(markup, /Use compact source grid/);
assert.match(markup, /data-source-feed-tabs="true"/);
assert.match(markup, /data-source-feed-filter="all"/);
assert.match(markup, /data-source-feed-filter="unused"/);
assert.match(markup, /data-source-feed-filter="used"/);
assert.match(markup, /data-source-feed-filter="rejected"/);
assert.match(markup, /Source usage filter/);
assert.match(markup, />All</);
assert.match(markup, />Not used</);
assert.match(markup, />Used</);
assert.match(markup, />Rejected</);
assert.match(markup, /Fresh source options/);
assert.match(markup, /Already sent to Clone/);
assert.match(markup, /Won&#x27;t use/);
assert.match(markup, /Used in Clone/);
assert.match(markup, /Used as a source/);
assert.match(markup, /Rejected as a source/);
assert.match(markup, /Reject/);
assert.match(markup, /Reject source from @creator/);
assert.match(markup, /Restore Source/);
assert.match(markup, /data-creator-list="true"/);
assert.match(markup, /data-creator-scroll-viewport="true"/);
assert.match(markup, /size-8 shrink-0 items-center/);
assert.match(markup, /max-w-full snap-x gap-2 overflow-x-auto overscroll-x-contain/);
assert.match(markup, /max-w-full overflow-hidden/);
assert.match(markup, /Refresh @creator/);
assert.match(markup, /Remove @creator/);
assert.match(markup, /sr-only">Refresh</);
assert.match(markup, /sr-only">Remove</);
assert.match(markup, /size-full object-cover/);
assert.match(markup, /\/api\/ugc-inspiration\/accounts\/account-1\/avatar/);
assert.doesNotMatch(markup, /All sources/);
assert.doesNotMatch(markup, /Recent creator discoveries/);
assert.doesNotMatch(markup, /Manage creators/);
assert.doesNotMatch(markup, /New Sources/);
assert.doesNotMatch(markup, /Tracked Creators/);
assert.doesNotMatch(markup, /Top Creator/);
assert.match(markup, />Preview</);
assert.match(markup, /snap-start/);
assert.match(markup, /max-h-\[440px\]/);
assert.match(markup, /data-source-preview-frame="portrait"/);
assert.match(markup, /object-cover/);

assert.equal(filterVideosBySourceUsage(videos, "all").length, 3);
assert.equal(filterVideosBySourceUsage(videos, "unused").length, 1);
assert.equal(filterVideosBySourceUsage(videos, "used").length, 1);
assert.equal(filterVideosBySourceUsage(videos, "rejected").length, 1);
assert.equal(filterVideosBySourceUsage(videos, "unused")[0]?.id, "video-1");
assert.equal(filterVideosBySourceUsage(videos, "used")[0]?.id, "video-2");
assert.equal(filterVideosBySourceUsage(videos, "rejected")[0]?.id, "video-3");

assert.match(emptyMarkup, /data-workspace-state="empty"/);
assert.match(emptyMarkup, /Start your discovery board/);
assert.match(emptyMarkup, /Track Creator/);

assert.equal(
  (manySourcesMarkup.match(/data-inspiration-video-id=/g) ?? []).length,
  24,
  "the initial source library should stay bounded"
);
assert.match(manySourcesMarkup, /Showing 24 of 30 matching sources/);
assert.match(manySourcesMarkup, /Load 6 more/);
assert.match(manySourcesMarkup, /data-inspiration-load-more="true"/);
assert.doesNotMatch(markup, /data-inspiration-load-more-accounts="true"/);
assert.match(manyAccountsMarkup, /data-inspiration-load-more-accounts="true"/);
assert.equal(
  inspirationVideoFeedPath({
    cursor: pagedCursor,
    take: INSPIRATION_VIDEO_PAGE_SIZE,
  }),
  `/api/ugc-inspiration/accounts/feed?take=24&cursor=${pagedCursor}`
);

assert.doesNotMatch(markup, /<aside/);
assert.match(markup, /<section class="min-w-0 px-4 py-5/);
assert.doesNotMatch(markup, /launch-card glass/);
assert.doesNotMatch(markup, /Manual refresh required/);
assert.doesNotMatch(markup, /transition-opacity/);
