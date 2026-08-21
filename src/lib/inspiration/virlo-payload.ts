import type { Prisma } from "@/generated/prisma/client";
import {
  buildTikTokProfileUrl,
  deriveTikTokEmbedUrl,
  extractTikTokVideoId,
  normalizeTikTokHandle,
  type VirloCreatorLookupResult,
} from "@/lib/inspiration/virlo";

export interface MappedVideoInput {
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

export interface MappedVirloCreator {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string;
  videos: MappedVideoInput[];
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

function findAvatarUrlLikeString(value: unknown, keyHint = ""): string | null {
  const normalizedKey = keyHint.toLowerCase().replace(/[^a-z0-9]/g, "");
  const keyLooksLikeAvatar =
    normalizedKey.includes("avatar") ||
    normalizedKey.includes("profilepic") ||
    normalizedKey.includes("profileimage") ||
    normalizedKey.includes("headshot");

  if (typeof value === "string") {
    const trimmed = value.trim();
    return keyLooksLikeAvatar && /^https?:\/\//i.test(trimmed)
      ? trimmed
      : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findAvatarUrlLikeString(item, keyHint);
      if (match) return match;
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const [key, nested] of Object.entries(value)) {
    const match = findAvatarUrlLikeString(nested, key);
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
  return (
    firstString(
      result.avatar_url,
      result.avatarUrl,
      result.avatar,
      result.avatar_thumb,
      result.avatarThumb,
      result.avatar_medium,
      result.avatarMedium,
      result.avatar_larger,
      result.avatarLarger,
      profile?.avatar_url,
      profile?.avatarUrl,
      profile?.avatar,
      profile?.avatar_thumb,
      profile?.avatarThumb,
      profile?.avatar_medium,
      profile?.avatarMedium,
      profile?.avatar_larger,
      profile?.avatarLarger,
      profile?.profile_pic_url,
      profile?.profilePicUrl,
      profile?.profile_image_url,
      profile?.profileImageUrl
    ) ?? findAvatarUrlLikeString(result)
  );
}

function getProfileUrl(result: VirloCreatorLookupResult, handle: string): string {
  const profile = isRecord(result.profile) ? result.profile : null;
  return (
    firstString(result.url, profile?.url, profile?.profile_url, profile?.profileUrl) ??
    buildTikTokProfileUrl(handle)
  );
}

export function mapVirloVideo(
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

export function mapVirloCreatorLookup(
  result: VirloCreatorLookupResult,
  fallbackHandle: string,
  seenAt: Date
): MappedVirloCreator {
  const username = normalizeTikTokHandle(
    firstString(result.username, fallbackHandle) ?? fallbackHandle
  );
  const rawVideos = Array.isArray(result.videos) ? result.videos : [];
  const videos = rawVideos
    .filter(isRecord)
    .map((video) => mapVirloVideo(video, seenAt))
    .filter((video): video is MappedVideoInput => video !== null);

  return {
    username,
    displayName: getDisplayName(result),
    avatarUrl: getAvatarUrl(result),
    profileUrl: getProfileUrl(result, username),
    videos,
  };
}
