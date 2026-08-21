import assert from "node:assert/strict";
import {
  mapVirloCreatorLookup,
  mapVirloVideo,
} from "../../src/lib/inspiration/virlo-payload";
import type { TrackedInspirationAccount } from "../../src/lib/inspiration/types";
import { INSPIRATION_VIDEO_PAGE_SIZE } from "../../src/lib/inspiration/types";

type AccountVideosKey = Extract<keyof TrackedInspirationAccount, "videos">;
type _AccountHasNoVideos = [AccountVideosKey] extends [never] ? true : never;
const _accountHasNoVideos: _AccountHasNoVideos = true;
void _accountHasNoVideos;

const listed: TrackedInspirationAccount = {
  id: "account-1",
  platform: "tiktok",
  handleNormalized: "creator",
  handleDisplay: "@creator",
  displayName: "Creator",
  avatarUrl: null,
  profileUrl: "https://www.tiktok.com/@creator",
  syncStatus: "ready",
  lastSyncAttemptAt: null,
  lastSyncedAt: "2026-06-12T12:00:00.000Z",
  lastSyncError: null,
  createdAt: "2026-06-12T12:00:00.000Z",
  updatedAt: "2026-06-12T12:00:00.000Z",
  isStale: false,
  videoCount: 30,
};

assert.equal(listed.videoCount, 30);
assert.equal(Object.prototype.hasOwnProperty.call(listed, "videos"), false);
assert.equal(INSPIRATION_VIDEO_PAGE_SIZE, 24);

const seenAt = new Date("2026-06-12T12:00:00Z");

const mappedVideo = mapVirloVideo(
  {
    id: "7350000000000000001",
    url: "https://www.tiktok.com/@creator/video/7350000000000000001",
    title: "hook",
    views: "1200",
    likes: 40,
    comments: 2,
    shares: 1,
    duration: 13,
    published_at: "2026-06-01T00:00:00Z",
    thumbnail: "https://example.com/thumb.jpg",
  },
  seenAt
);
assert.ok(mappedVideo);
assert.equal(mappedVideo.externalVideoId, "7350000000000000001");
assert.equal(
  mappedVideo.originalUrl,
  "https://www.tiktok.com/@creator/video/7350000000000000001"
);
assert.equal(
  mappedVideo.embedUrl,
  "https://www.tiktok.com/embed/v3/7350000000000000001"
);
assert.equal(mappedVideo.caption, "hook");
assert.equal(mappedVideo.viewCount, 1200);
assert.equal(mappedVideo.likeCount, 40);
assert.equal(mappedVideo.lastSeenAt.toISOString(), seenAt.toISOString());

assert.equal(mapVirloVideo({ title: "no ids" }, seenAt), null);

const nestedVideo = mapVirloVideo(
  {
    videoId: "99",
    share: { permalink: "https://www.tiktok.com/@creator/video/99" },
  },
  seenAt
);
assert.ok(nestedVideo);
assert.equal(nestedVideo.externalVideoId, "99");
assert.equal(nestedVideo.originalUrl, "https://www.tiktok.com/@creator/video/99");

const creator = mapVirloCreatorLookup(
  {
    username: "Mapped.Handle",
    display_name: "Mapped Creator",
    profile: {
      avatar_url: "https://example.com/avatar.jpg",
      profile_url: "https://www.tiktok.com/@mapped.handle",
    },
    videos: [
      {
        id: "1",
        url: "https://www.tiktok.com/@mapped.handle/video/1",
      },
      { title: "missing ids" },
    ],
  },
  "fallback",
  seenAt
);
assert.equal(creator.username, "mapped.handle");
assert.equal(creator.displayName, "Mapped Creator");
assert.equal(creator.avatarUrl, "https://example.com/avatar.jpg");
assert.equal(creator.profileUrl, "https://www.tiktok.com/@mapped.handle");
assert.equal(creator.videos.length, 1);
assert.equal(creator.videos[0]?.externalVideoId, "1");

const fallbackCreator = mapVirloCreatorLookup({}, "Fallback_User", seenAt);
assert.equal(fallbackCreator.username, "fallback_user");
assert.equal(fallbackCreator.displayName, null);
assert.equal(fallbackCreator.avatarUrl, null);
assert.equal(fallbackCreator.profileUrl, "https://www.tiktok.com/@fallback_user");
assert.equal(fallbackCreator.videos.length, 0);
