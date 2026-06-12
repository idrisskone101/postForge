import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { InspirationPageClient } from "../src/app/ugc-inspiration/inspiration-page-client";
import type { TrackedInspirationAccount } from "../src/lib/inspiration/types";

const accounts: TrackedInspirationAccount[] = [
  {
    id: "account-1",
    platform: "tiktok",
    handleNormalized: "creator",
    handleDisplay: "@creator",
    displayName: "Creator",
    avatarUrl: null,
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

assert.match(markup, /Source Selection/);
assert.match(markup, /Compare creator posts/);
assert.match(markup, /Preview source from @creator/);
assert.match(markup, /Use in Clone/);
assert.match(markup, /Creator Sync/);
assert.match(markup, /New Sources/);
assert.match(markup, /Preview Details/);
assert.match(markup, /max-h-\[480px\]/);
assert.match(markup, /data-source-preview-frame="portrait"/);
assert.match(markup, /object-contain/);

assert.match(markup, /<aside class="hidden w-64 shrink-0/);
assert.match(markup, /<section class="min-w-0 flex-1 overflow-y-auto/);
assert.doesNotMatch(markup, /launch-card glass/);
