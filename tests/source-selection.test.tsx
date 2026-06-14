import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  InspirationHeaderControls,
  InspirationPageClient,
} from "../src/app/ugc-inspiration/inspiration-page-client";
import type { TrackedInspirationAccount } from "../src/lib/inspiration/types";

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
    videos: [
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
      },
    ],
  },
];

const markup = renderToStaticMarkup(
  <InspirationPageClient initialAccounts={accounts} />
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
  <InspirationPageClient initialAccounts={[]} />
);

assert.match(headerMarkup, /Source Selection/);
assert.match(headerMarkup, /Compare creator posts/);
assert.match(headerMarkup, /Track Creator/);
assert.match(headerMarkup, /lg:max-w-\[780px\]/);
assert.doesNotMatch(markup, /Source Selection/);
assert.match(markup, /Preview source from @creator/);
assert.match(markup, /Use in Clone/);
assert.match(markup, /Creators/);
assert.match(markup, /Creator Feed/);
assert.match(markup, /All tracked creator videos/);
assert.match(markup, /data-creator-list="true"/);
assert.match(markup, /size-8 shrink-0 items-center/);
assert.match(markup, /mt-2 grid grid-cols-\[minmax\(0,1fr\)_1\.75rem\]/);
assert.match(markup, /line-clamp-2 break-all/);
assert.match(markup, /Refresh @creator/);
assert.match(markup, /Remove @creator/);
assert.match(markup, />Refresh</);
assert.match(markup, /sr-only">Remove</);
assert.match(markup, /text-destructive\/65/);
assert.match(markup, /size-full object-cover/);
assert.match(markup, /\/api\/ugc-inspiration\/accounts\/account-1\/avatar/);
assert.doesNotMatch(markup, /All sources/);
assert.doesNotMatch(markup, /Recent creator discoveries/);
assert.doesNotMatch(markup, /Manage creators/);
assert.doesNotMatch(markup, /New Sources/);
assert.doesNotMatch(markup, /Tracked Creators/);
assert.doesNotMatch(markup, /Top Creator/);
assert.match(markup, /Preview Details/);
assert.match(markup, /mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto/);
assert.match(markup, /max-h-\[480px\]/);
assert.match(markup, /data-source-preview-frame="portrait"/);
assert.match(markup, /object-contain/);

assert.match(emptyMarkup, /data-workspace-state="empty"/);
assert.match(emptyMarkup, /Start your discovery board/);
assert.match(emptyMarkup, /Track Creator/);

assert.match(markup, /<aside class="sticky top-0 hidden h-screen w-80 shrink-0/);
assert.match(markup, /<section class="min-w-0 flex-1 overflow-y-auto/);
assert.doesNotMatch(markup, /launch-card glass/);
assert.doesNotMatch(markup, /Manual refresh required/);
assert.doesNotMatch(markup, /transition-opacity/);
