import type { ProviderOAuthConfig } from "./config";
import { IntegrationProviderError, providerJson } from "./providers/http";
import type { ProviderFetch } from "./providers/types";
import type {
  IntegrationAccount,
  IntegrationProvider,
} from "./types";
import { isWellFormedUnicode, unicodeCodePointLength } from "../unicode";
import {
  inspectInstagramReelMedia,
  InstagramMediaProbeError,
} from "./instagram-media-probe";

const MEBIBYTE = 1024 * 1024;
// Provider limits are much larger, but the current Node executor materializes a
// full upload for YouTube. Keep the product limit honest and bounded before any
// read rather than advertising provider maxima this runtime cannot safely hold.
export const MAX_SOCIAL_PUBLISH_MEDIA_BYTES = 128 * MEBIBYTE;
const PROVIDER_CONTROL_TIMEOUT_MS = 20_000;
const YOUTUBE_UPLOAD_TIMEOUT_MS = 300_000;

export type ShortPublishMedia = {
  id: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  bytes: Buffer;
  publicUrl?: string;
  /** Server-resolved path used only for pre-publication media inspection. */
  localPath?: string;
};

export type ProviderShortPublishResult = {
  status: "submitted" | "published";
  externalId: string;
  providerStatus: string;
  visibility: ProviderVisibility;
  /** The provider's exact privacy value, when the provider returned one. */
  providerVisibility: string | null;
};

export type ProviderPublishProgress = {
  status: "submitted" | "published";
  externalId: string | null;
  providerStatus: string;
  visibility: ProviderVisibility;
  providerVisibility: string | null;
};

export type ProviderVisibility =
  | "private"
  | "followers"
  | "friends"
  | "unlisted"
  | "public";

export const TIKTOK_PRIVACY_LEVELS = [
  "PUBLIC_TO_EVERYONE",
  "FOLLOWER_OF_CREATOR",
  "MUTUAL_FOLLOW_FRIENDS",
  "SELF_ONLY",
] as const;

export type TikTokPrivacyLevel = (typeof TIKTOK_PRIVACY_LEVELS)[number];

export type TikTokCreatorPublishingInfo = {
  creatorUsername: string;
  creatorNickname: string;
  privacyLevelOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
  maximumVideoDurationSec: number;
};

export type TikTokPublishSettings = {
  privacyLevel: TikTokPrivacyLevel;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
};

export type TikTokPublishStatus = {
  status: "processing" | "published" | "failed";
  providerStatus: string;
};

export type ProviderPublicationStatus = {
  status: "processing" | "published" | "failed";
  providerStatus: string;
  visibility?: ProviderVisibility;
  providerVisibility?: string | null;
};

export type YouTubePublishSettings = {
  title: string;
  description: string;
  privacyStatus: "private" | "unlisted" | "public";
  selfDeclaredMadeForKids: boolean;
  audienceConfirmed: boolean;
  communityGuidelinesConfirmed: boolean;
};

export type ProviderShortPublishRequest = {
  provider: IntegrationProvider;
  config: ProviderOAuthConfig;
  accessToken: string;
  account: IntegrationAccount;
  media: ShortPublishMedia;
  caption: string;
  tiktokSettings?: TikTokPublishSettings;
  youtubeSettings?: YouTubePublishSettings;
};

export type ProviderPublishingDependencies = {
  fetch?: ProviderFetch;
  wait?: (milliseconds: number) => Promise<void>;
  onProgress?: (progress: ProviderPublishProgress) => Promise<void>;
  onRecoverySession?: (uploadUrl: string) => Promise<void>;
  inspectInstagramMedia?: (localPath: string) => Promise<void>;
};

export class IntegrationMediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationMediaValidationError";
  }
}

export class IntegrationPublicationTerminalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationPublicationTerminalError";
  }
}

export class IntegrationPublicationAmbiguousError extends Error {
  readonly authorizationFailure: boolean;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "IntegrationPublicationAmbiguousError";
    this.authorizationFailure =
      cause instanceof IntegrationProviderError &&
      cause.kind === "authorization";
  }
}

function exactCaption(
  value: string,
  maximum: number,
  provider: string,
  length: (candidate: string) => number = unicodeCodePointLength
) {
  if (!isWellFormedUnicode(value)) {
    throw new IntegrationMediaValidationError(
      `${provider} caption contains invalid Unicode`
    );
  }
  if (length(value) > maximum) {
    throw new IntegrationMediaValidationError(
      `${provider} caption must be ${maximum} characters or fewer`
    );
  }
  return value;
}

export function parseRetryAfterMilliseconds(
  value: string | null,
  nowMs = Date.now()
) {
  if (!value) return null;
  const seconds = Number(value.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.round(seconds * 1000), 10_000);
  }
  const dateMs = Date.parse(value);
  if (!Number.isFinite(dateMs) || dateMs <= nowMs) return null;
  return Math.min(dateMs - nowMs, 10_000);
}

const YOUTUBE_RESUMABLE_RETRYABLE_STATUSES = new Set([
  500, 502, 503, 504,
]);

export function youtubeResumableStatusIsRetryable(status: number) {
  return YOUTUBE_RESUMABLE_RETRYABLE_STATUSES.has(status);
}

function positiveMediaNumber(value: number | null, label: string) {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    throw new IntegrationMediaValidationError(
      `Approved video ${label} is missing; regenerate the asset before publishing`
    );
  }
  return value;
}

export function assertSocialPublishMediaSizeBytes(size: number) {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new IntegrationMediaValidationError(
      "Approved video has no stored media data"
    );
  }
  if (size > MAX_SOCIAL_PUBLISH_MEDIA_BYTES) {
    throw new IntegrationMediaValidationError(
      "PostForge social publishing currently supports generated videos up to 128 MB"
    );
  }
  return size;
}

function validateCommonMedia(media: ShortPublishMedia) {
  assertSocialPublishMediaSizeBytes(media.bytes.length);
  if (!media.mimeType.startsWith("video/")) {
    throw new IntegrationMediaValidationError(
      "Only an approved generated video can be published"
    );
  }
  return {
    width: positiveMediaNumber(media.width, "width"),
    height: positiveMediaNumber(media.height, "height"),
    duration: positiveMediaNumber(media.durationSec, "duration"),
  };
}

function validateTikTokMedia(
  media: ShortPublishMedia,
  maximumCreatorDuration: number
) {
  const metadata = validateCommonMedia(media);
  if (!new Set(["video/mp4", "video/quicktime", "video/webm"]).has(media.mimeType)) {
    throw new IntegrationMediaValidationError(
      "TikTok Direct Post requires an MP4, MOV, or WebM video"
    );
  }
  if (
    metadata.width < 360 ||
    metadata.height < 360 ||
    metadata.width > 4096 ||
    metadata.height > 4096
  ) {
    throw new IntegrationMediaValidationError(
      "TikTok videos must be between 360 and 4096 pixels in both dimensions"
    );
  }
  if (
    metadata.duration > 600 ||
    metadata.duration > maximumCreatorDuration
  ) {
    throw new IntegrationMediaValidationError(
      `This TikTok account accepts videos up to ${Math.floor(
        Math.min(600, maximumCreatorDuration)
      )} seconds`
    );
  }
}

function validateInstagramMedia(media: ShortPublishMedia) {
  const metadata = validateCommonMedia(media);
  if (!new Set(["video/mp4", "video/quicktime"]).has(media.mimeType)) {
    throw new IntegrationMediaValidationError(
      "Instagram Reels require an MP4 or MOV video"
    );
  }
  if (metadata.duration < 3 || metadata.duration > 900) {
    throw new IntegrationMediaValidationError(
      "Instagram Reels must be between 3 seconds and 15 minutes"
    );
  }
  if (metadata.width > 1920) {
    throw new IntegrationMediaValidationError(
      "Instagram Reels cannot exceed 1920 horizontal pixels"
    );
  }
}

function validateYouTubeShortMedia(media: ShortPublishMedia) {
  const metadata = validateCommonMedia(media);
  if (metadata.width > metadata.height) {
    throw new IntegrationMediaValidationError(
      "YouTube Shorts require a square or vertical video"
    );
  }
  if (metadata.duration > 180) {
    throw new IntegrationMediaValidationError(
      "YouTube Shorts must be 3 minutes or shorter"
    );
  }
}

type TikTokEnvelope = {
  error?: { code?: string };
};

function assertTikTokEnvelope(value: TikTokEnvelope, operation: string) {
  const code = value.error?.code;
  if (code === "ok") return;
  const normalized = code?.toLowerCase() ?? "missing_error_envelope";
  const authorizationFailure =
    normalized.includes("access_token") ||
    normalized.includes("scope_not_authorized") ||
    normalized.includes("unauthorized");
  if (normalized === "spam_risk_too_many_posts") {
    throw new IntegrationPublicationTerminalError(
      "TikTok's daily API post limit for this account has been reached. Use the TikTok app or try again later."
    );
  }
  if (normalized === "spam_risk_user_banned_from_posting") {
    throw new IntegrationPublicationTerminalError(
      "TikTok reports that this account is currently blocked from posting. Resolve the restriction in TikTok before trying again."
    );
  }
  if (normalized === "reached_active_user_cap") {
    throw new IntegrationPublicationTerminalError(
      "TikTok's daily active-creator limit for this app has been reached. Try again later."
    );
  }
  throw new IntegrationProviderError(
    "TikTok",
    operation,
    authorizationFailure ? 401 : 502
  );
}

export async function queryTikTokCreatorPublishingInfo(
  accessToken: string,
  fetchImpl: ProviderFetch = fetch
): Promise<TikTokCreatorPublishingInfo> {
  const creator = await providerJson<
    TikTokEnvelope & {
      data?: {
        creator_username?: string;
        creator_nickname?: string;
        privacy_level_options?: string[];
        comment_disabled?: boolean;
        duet_disabled?: boolean;
        stitch_disabled?: boolean;
        max_video_post_duration_sec?: number;
      };
    }
  >(
    "TikTok",
    "creator publishing check",
    "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    },
    fetchImpl
  );
  assertTikTokEnvelope(creator, "creator publishing check");
  const data = creator.data;
  const privacyLevelOptions = (data?.privacy_level_options ?? []).filter(
    (value): value is TikTokPrivacyLevel =>
      (TIKTOK_PRIVACY_LEVELS as readonly string[]).includes(value)
  );
  const maximumVideoDurationSec = data?.max_video_post_duration_sec;
  if (
    !data?.creator_username?.trim() ||
    !data.creator_nickname?.trim() ||
    privacyLevelOptions.length === 0 ||
    typeof data.comment_disabled !== "boolean" ||
    typeof data.duet_disabled !== "boolean" ||
    typeof data.stitch_disabled !== "boolean" ||
    typeof maximumVideoDurationSec !== "number" ||
    !Number.isFinite(maximumVideoDurationSec) ||
    maximumVideoDurationSec <= 0
  ) {
    throw new IntegrationProviderError(
      "TikTok",
      "creator publishing check",
      502
    );
  }
  return {
    creatorUsername: data.creator_username,
    creatorNickname: data.creator_nickname,
    privacyLevelOptions,
    commentDisabled: data.comment_disabled,
    duetDisabled: data.duet_disabled,
    stitchDisabled: data.stitch_disabled,
    maximumVideoDurationSec,
  };
}

export async function queryTikTokPublishStatus(
  accessToken: string,
  publishId: string,
  fetchImpl: ProviderFetch = fetch
): Promise<TikTokPublishStatus> {
  const response = await providerJson<
    TikTokEnvelope & { data?: { status?: string; fail_reason?: string } }
  >(
    "TikTok",
    "Direct Post status",
    "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    },
    fetchImpl
  );
  assertTikTokEnvelope(response, "Direct Post status");
  const providerStatus = response.data?.status?.trim() || "PROCESSING_UPLOAD";
  const rawFailReason = response.data?.fail_reason?.trim().toLowerCase();
  const allowedFailReasons = new Set([
    "auth_removed",
    "file_format_check_failed",
    "duration_check_failed",
    "frame_rate_check_failed",
    "picture_size_check_failed",
    "video_pull_failed",
    "photo_pull_failed",
    "publish_cancelled",
    "internal",
    "spam_risk_too_many_posts",
    "spam_risk_user_banned_from_posting",
    "spam_risk_text",
    "spam_risk",
  ]);
  const failReason =
    rawFailReason && allowedFailReasons.has(rawFailReason)
      ? rawFailReason
      : null;
  if (providerStatus === "FAILED" && failReason === "auth_removed") {
    throw new IntegrationProviderError(
      "TikTok",
      "Direct Post authorization removed",
      401,
      "authorization"
    );
  }
  return {
    status:
      providerStatus === "PUBLISH_COMPLETE"
        ? "published"
        : providerStatus === "FAILED"
          ? "failed"
          : "processing",
    providerStatus:
      providerStatus === "FAILED" && failReason
        ? `${providerStatus}:${failReason.toUpperCase()}`
        : providerStatus,
  };
}

export async function queryYouTubePublishStatus(
  accessToken: string,
  videoId: string,
  fetchImpl: ProviderFetch = fetch
): Promise<ProviderPublicationStatus> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.search = new URLSearchParams({
    part: "status,processingDetails",
    id: videoId,
  }).toString();
  const response = await providerJson<{
    items?: Array<{
      status?: {
        uploadStatus?: string;
        rejectionReason?: string;
        privacyStatus?: string;
      };
      processingDetails?: { processingStatus?: string };
    }>;
  }>(
    "YouTube",
    "upload status",
    url,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    fetchImpl
  );
  const item = response.items?.[0];
  const uploadStatus = item?.status?.uploadStatus?.toLowerCase();
  const processingStatus =
    item?.processingDetails?.processingStatus?.toLowerCase();
  const privacyStatus = item?.status?.privacyStatus?.toLowerCase();
  if (!uploadStatus) {
    throw new IntegrationProviderError("YouTube", "upload status", 502);
  }
  const failed =
    uploadStatus === "failed" ||
    uploadStatus === "rejected" ||
    uploadStatus === "deleted" ||
    processingStatus === "failed" ||
    processingStatus === "terminated";
  const complete =
    uploadStatus === "processed" || processingStatus === "succeeded";
  return {
    status: failed ? "failed" : complete ? "published" : "processing",
    providerStatus: [uploadStatus, processingStatus]
      .filter(Boolean)
      .join(":")
      .toUpperCase(),
    ...(privacyStatus === "private" ||
    privacyStatus === "unlisted" ||
    privacyStatus === "public"
      ? {
          visibility: privacyStatus,
          providerVisibility: privacyStatus,
        }
      : {}),
  };
}

function trustedProviderUrl(
  value: string,
  provider: "TikTok" | "YouTube",
  allowedHost: (hostname: string) => boolean
) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !allowedHost(url.hostname.toLowerCase())
    ) {
      throw new Error("Untrusted upload URL");
    }
    return url.toString();
  } catch {
    throw new IntegrationProviderError(provider, "upload session validation", 502);
  }
}

async function providerBinaryRequest(
  provider: "TikTok" | "YouTube",
  operation: string,
  url: string,
  init: RequestInit,
  fetchImpl: ProviderFetch,
  kind?: "authorization" | "provider"
) {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(PROVIDER_CONTROL_TIMEOUT_MS),
    });
  } catch {
    throw new IntegrationProviderError(
      provider,
      operation,
      null,
      kind ?? "provider"
    );
  }
  if (!response.ok) {
    throw new IntegrationProviderError(
      provider,
      operation,
      response.status,
      kind ?? (response.status === 401 ? "authorization" : "provider")
    );
  }
  return response;
}

function publicAssetUrl(
  value: string | undefined,
  provider: "TikTok" | "Instagram"
) {
  try {
    if (!value) throw new Error("Signed URL required");
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      isLocal
    ) {
      throw new Error("Public HTTPS URL required");
    }
    return url.toString();
  } catch {
    throw new IntegrationMediaValidationError(
      `${provider} publishing requires POSTFORGE_PUBLIC_URL to be a public HTTPS origin`
    );
  }
}

async function publishTikTokShort(
  request: ProviderShortPublishRequest,
  fetchImpl: ProviderFetch,
  onProgress: (progress: ProviderPublishProgress) => Promise<void>
): Promise<ProviderShortPublishResult> {
  const creator = await queryTikTokCreatorPublishingInfo(
    request.accessToken,
    fetchImpl
  );
  const settings = request.tiktokSettings;
  if (!settings) {
    throw new IntegrationMediaValidationError(
      "Choose TikTok privacy and interaction settings before publishing"
    );
  }
  if (!creator.privacyLevelOptions.includes(settings.privacyLevel)) {
    throw new IntegrationMediaValidationError(
      "The selected TikTok privacy option is no longer available; review the latest options"
    );
  }
  if (!request.config.tiktokDirectPostApprovalAcknowledged) {
    throw new IntegrationMediaValidationError(
      "Live TikTok publishing is unavailable until an operator verifies TikTok's Direct Post approval in the developer portal. Internal or team-only tools may not qualify for approval."
    );
  }
  if (
    (creator.commentDisabled && settings.allowComment) ||
    (creator.duetDisabled && settings.allowDuet) ||
    (creator.stitchDisabled && settings.allowStitch)
  ) {
    throw new IntegrationMediaValidationError(
      "The selected TikTok interaction settings are no longer available"
    );
  }
  if (settings.brandContent && settings.privacyLevel === "SELF_ONLY") {
    throw new IntegrationMediaValidationError(
      "TikTok paid partnership posts cannot use Only me visibility"
    );
  }
  validateTikTokMedia(request.media, creator.maximumVideoDurationSec);
  const caption = exactCaption(
    request.caption,
    2200,
    "TikTok",
    (value) => value.length
  );

  const visibility: ProviderVisibility =
    settings.privacyLevel === "SELF_ONLY"
      ? "private"
      : settings.privacyLevel === "FOLLOWER_OF_CREATOR"
        ? "followers"
        : settings.privacyLevel === "MUTUAL_FOLLOW_FRIENDS"
          ? "friends"
          : "public";
  // TikTok exposes no client idempotency key for this irreversible enqueue.
  // Persist the boundary before the request so a lost response can never make
  // the UI offer a blind retry that might duplicate a post.
  await onProgress({
    status: "submitted",
    externalId: null,
    providerStatus: "INIT_REQUEST_SENT",
    visibility,
    providerVisibility: null,
  });
  let initialized: TikTokEnvelope & {
    data?: { publish_id?: string; upload_url?: string };
  };
  try {
    initialized = await providerJson<
      TikTokEnvelope & { data?: { publish_id?: string; upload_url?: string } }
    >(
      "TikTok",
      "Direct Post initialization",
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${request.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: caption,
            privacy_level: settings.privacyLevel,
            disable_duet: creator.duetDisabled || !settings.allowDuet,
            disable_comment: creator.commentDisabled || !settings.allowComment,
            disable_stitch: creator.stitchDisabled || !settings.allowStitch,
            brand_content_toggle: settings.brandContent,
            brand_organic_toggle: settings.brandOrganic,
            is_aigc: true,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: publicAssetUrl(request.media.publicUrl, "TikTok"),
          },
        }),
      },
      fetchImpl
    );
  } catch (cause) {
    if (
      cause instanceof IntegrationProviderError &&
      cause.status !== null &&
      cause.status >= 400 &&
      cause.status < 500
    ) {
      throw cause;
    }
    await onProgress({
      status: "submitted",
      externalId: null,
      providerStatus: "INIT_OUTCOME_UNKNOWN",
      visibility,
      providerVisibility: null,
    });
    throw new IntegrationPublicationAmbiguousError(
      "TikTok may have accepted the Direct Post request, but no publish id was returned. Verify the account manually; automatic retry is disabled to prevent a duplicate.",
      cause
    );
  }
  try {
    assertTikTokEnvelope(initialized, "Direct Post initialization");
  } catch (cause) {
    if (
      cause instanceof IntegrationProviderError &&
      cause.kind === "authorization"
    ) {
      throw cause;
    }
    throw new IntegrationPublicationTerminalError(
      cause instanceof Error
        ? cause.message
        : "TikTok rejected the Direct Post request before accepting it"
    );
  }
  const publishId = initialized.data?.publish_id?.trim();
  if (!publishId) {
    await onProgress({
      status: "submitted",
      externalId: null,
      providerStatus: "INIT_OUTCOME_UNKNOWN",
      visibility,
      providerVisibility: null,
    });
    throw new IntegrationPublicationAmbiguousError(
      "TikTok returned no publish id after the Direct Post request. Verify the account manually; automatic retry is disabled to prevent a duplicate."
    );
  }
  await onProgress({
    status: "submitted",
    externalId: publishId,
    providerStatus: "INITIALIZED",
    visibility,
    providerVisibility: null,
  });

  let status: TikTokPublishStatus;
  try {
    status = await queryTikTokPublishStatus(
      request.accessToken,
      publishId,
      fetchImpl
    );
  } catch (cause) {
    throw new IntegrationPublicationAmbiguousError(
      "TikTok accepted the post but did not confirm its current status",
      cause
    );
  }
  if (status.status === "failed") {
    throw new IntegrationPublicationTerminalError(
      "TikTok reported that Direct Post processing failed"
    );
  }
  return {
    status: status.status === "published" ? "published" : "submitted",
    externalId: publishId,
    providerStatus: status.providerStatus,
    visibility,
    providerVisibility: null,
  };
}

async function publishInstagramReel(
  request: ProviderShortPublishRequest,
  fetchImpl: ProviderFetch,
  wait: (milliseconds: number) => Promise<void>,
  onProgress: (progress: ProviderPublishProgress) => Promise<void>,
  inspectMedia: (localPath: string) => Promise<void>
): Promise<ProviderShortPublishResult> {
  validateInstagramMedia(request.media);
  if (!request.media.localPath) {
    throw new IntegrationMediaValidationError(
      "PostForge could not inspect the Instagram video encoding; regenerate the approved asset"
    );
  }
  try {
    await inspectMedia(request.media.localPath);
  } catch (cause) {
    throw new IntegrationMediaValidationError(
      cause instanceof InstagramMediaProbeError
        ? cause.message
        : "PostForge could not inspect the Instagram video encoding; regenerate the approved asset"
    );
  }
  const root = `https://graph.instagram.com/${request.config.instagramGraphVersion}`;
  const container = await providerJson<{ id?: string }>(
    "Instagram",
    "Reel container creation",
    `${root}/${encodeURIComponent(request.account.id)}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        media_type: "REELS",
        video_url: publicAssetUrl(request.media.publicUrl, "Instagram"),
        caption: exactCaption(request.caption, 2200, "Instagram"),
        share_to_feed: "false",
      }),
    },
    fetchImpl
  );
  const containerId = container.id?.trim();
  if (!containerId) {
    throw new IntegrationProviderError("Instagram", "Reel container creation", 502);
  }
  await onProgress({
    status: "submitted",
    externalId: containerId,
    providerStatus: "CONTAINER_CREATED",
    visibility: "public",
    providerVisibility: "PUBLIC",
  });

  return resumeInstagramReel(
    {
      config: request.config,
      accessToken: request.accessToken,
      account: request.account,
      containerId,
    },
    { fetch: fetchImpl, wait, onProgress }
  );
}

export async function resumeInstagramReel(
  input: {
    config: ProviderOAuthConfig;
    accessToken: string;
    account: IntegrationAccount;
    containerId: string;
  },
  dependencies: ProviderPublishingDependencies = {}
): Promise<ProviderShortPublishResult> {
  const fetchImpl = dependencies.fetch ?? fetch;
  const wait =
    dependencies.wait ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const onProgress = dependencies.onProgress ?? (async () => undefined);
  const root = `https://graph.instagram.com/${input.config.instagramGraphVersion}`;
  const containerId = input.containerId;

  let finished = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const url = new URL(`${root}/${encodeURIComponent(containerId)}`);
    url.searchParams.set("fields", "status_code,status");
    let status: { status_code?: string };
    try {
      status = await providerJson<{ status_code?: string }>(
        "Instagram",
        "Reel processing status",
        url,
        { headers: { Authorization: `Bearer ${input.accessToken}` } },
        fetchImpl
      );
    } catch (cause) {
      throw new IntegrationPublicationAmbiguousError(
        "Instagram accepted the Reel container but did not confirm processing status",
        cause
      );
    }
    const statusCode = status.status_code?.toUpperCase();
    if (statusCode === "FINISHED") {
      finished = true;
      break;
    }
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      throw new IntegrationPublicationTerminalError(
        "Instagram reported that Reel processing failed or expired"
      );
    }
    if (attempt < 19) await wait(1500);
  }
  if (!finished) {
    throw new IntegrationPublicationAmbiguousError(
      "Instagram is still processing the Reel container; refresh its status before retrying"
    );
  }
  await onProgress({
    status: "submitted",
    externalId: containerId,
    providerStatus: "READY_TO_PUBLISH",
    visibility: "public",
    providerVisibility: "PUBLIC",
  });

  // Meta does not document media_publish as idempotent. Once this boundary is
  // persisted, a lost response must be reconciled manually, never re-posted.
  await onProgress({
    status: "submitted",
    externalId: containerId,
    providerStatus: "PUBLISH_REQUEST_SENT",
    visibility: "public",
    providerVisibility: "PUBLIC",
  });

  let published: { id?: string };
  try {
    published = await providerJson<{ id?: string }>(
      "Instagram",
      "Reel publishing",
      `${root}/${encodeURIComponent(input.account.id)}/media_publish`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ creation_id: containerId }),
      },
      fetchImpl
    );
  } catch (cause) {
    if (
      cause instanceof IntegrationProviderError &&
      cause.status !== null &&
      cause.status >= 400 &&
      cause.status < 500
    ) {
      if (cause.kind === "authorization") throw cause;
      throw new IntegrationPublicationTerminalError(cause.message);
    }
    await onProgress({
      status: "submitted",
      externalId: containerId,
      providerStatus: "PUBLISH_OUTCOME_UNKNOWN",
      visibility: "public",
      providerVisibility: "PUBLIC",
    });
    throw new IntegrationPublicationAmbiguousError(
      "Instagram did not confirm whether the ready Reel was published; verify the account before retrying",
      cause
    );
  }
  const mediaId = published.id?.trim();
  if (!mediaId) {
    await onProgress({
      status: "submitted",
      externalId: containerId,
      providerStatus: "PUBLISH_OUTCOME_UNKNOWN",
      visibility: "public",
      providerVisibility: "PUBLIC",
    });
    throw new IntegrationPublicationAmbiguousError(
      "Instagram returned success without a media id. Verify the account before retrying."
    );
  }
  await onProgress({
    status: "published",
    externalId: mediaId,
    providerStatus: "PUBLISHED",
    visibility: "public",
    providerVisibility: "PUBLIC",
  });
  return {
    status: "published",
    externalId: mediaId,
    providerStatus: "PUBLISHED",
    visibility: "public",
    providerVisibility: "PUBLIC",
  };
}

async function publishYouTubeShort(
  request: ProviderShortPublishRequest,
  fetchImpl: ProviderFetch,
  onProgress: (progress: ProviderPublishProgress) => Promise<void>,
  onRecoverySession: (uploadUrl: string) => Promise<void>
): Promise<ProviderShortPublishResult> {
  validateYouTubeShortMedia(request.media);
  const settings = request.youtubeSettings;
  if (!settings) {
    throw new IntegrationMediaValidationError(
      "Choose YouTube metadata, audience, and visibility before publishing"
    );
  }
  if (
    typeof settings.selfDeclaredMadeForKids !== "boolean" ||
    settings.audienceConfirmed !== true
  ) {
    throw new IntegrationMediaValidationError(
      "Explicitly designate whether this YouTube video is made for kids"
    );
  }
  if (settings.communityGuidelinesConfirmed !== true) {
    throw new IntegrationMediaValidationError(
      "Confirm that this upload complies with YouTube Community Guidelines"
    );
  }
  const title = settings.title;
  if (
    !title.trim() ||
    !isWellFormedUnicode(title) ||
    unicodeCodePointLength(title) > 100 ||
    /[<>]/.test(title)
  ) {
    throw new IntegrationMediaValidationError(
      "YouTube title is required, must be 100 characters or fewer, and cannot contain angle brackets"
    );
  }
  if (
    !isWellFormedUnicode(settings.description) ||
    Buffer.byteLength(settings.description, "utf8") > 5000 ||
    /[<>]/.test(settings.description)
  ) {
    throw new IntegrationMediaValidationError(
      "YouTube description must be 5000 UTF-8 bytes or fewer and cannot contain angle brackets"
    );
  }
  const metadata = JSON.stringify({
    snippet: {
      title,
      description: settings.description,
      categoryId: "22",
    },
    status: {
      privacyStatus: settings.privacyStatus,
      containsSyntheticMedia: true,
      selfDeclaredMadeForKids: settings.selfDeclaredMadeForKids,
    },
  });
  const sessionUrl = new URL(
    "https://www.googleapis.com/upload/youtube/v3/videos"
  );
  sessionUrl.search = new URLSearchParams({
    uploadType: "resumable",
    part: "snippet,status",
  }).toString();
  const session = await providerBinaryRequest(
    "YouTube",
    "resumable upload initialization",
    sessionUrl.toString(),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "Content-Length": String(Buffer.byteLength(metadata)),
        "X-Upload-Content-Length": String(request.media.bytes.length),
        "X-Upload-Content-Type": request.media.mimeType,
      },
      body: metadata,
    },
    fetchImpl
  );
  const location = session.headers.get("location");
  if (!location) {
    throw new IntegrationProviderError(
      "YouTube",
      "resumable upload initialization",
      502
    );
  }
  const uploadUrl = trustedProviderUrl(
    location,
    "YouTube",
    (hostname) => hostname === "www.googleapis.com"
  );
  const visibility = settings.privacyStatus;
  await onRecoverySession(uploadUrl);
  await onProgress({
    status: "submitted",
    externalId: null,
    providerStatus: "UPLOAD_SESSION_CREATED",
    visibility,
    providerVisibility: null,
  });
  return resumeYouTubeUpload(
    {
      uploadUrl,
      accessToken: request.accessToken,
      media: request.media,
      visibility,
    },
    { fetch: fetchImpl, onProgress }
  );
}

async function parseYouTubeUploadResult(
  response: Response,
  requestedVisibility: "private" | "unlisted" | "public"
) {
  let resource: { id?: string; status?: { privacyStatus?: string } };
  try {
    resource = (await response.json()) as {
      id?: string;
      status?: { privacyStatus?: string };
    };
  } catch {
    throw new IntegrationProviderError("YouTube", "video upload response", 502);
  }
  const videoId = resource.id?.trim();
  if (!videoId) {
    throw new IntegrationProviderError("YouTube", "video upload response", 502);
  }
  const privacyStatus = resource.status?.privacyStatus?.toLowerCase();
  const actualVisibility =
    privacyStatus === "private" ||
    privacyStatus === "unlisted" ||
    privacyStatus === "public"
      ? privacyStatus
      : requestedVisibility;
  return {
    videoId,
    visibility: actualVisibility,
    providerVisibility:
      privacyStatus === "private" ||
      privacyStatus === "unlisted" ||
      privacyStatus === "public"
        ? privacyStatus
        : null,
  };
}

function uploadedByteCount(response: Response) {
  const range = response.headers.get("range");
  if (!range) return 0;
  const match = /^bytes=0-(\d+)$/.exec(range.trim());
  if (!match) return 0;
  const end = Number(match[1]);
  return Number.isSafeInteger(end) && end >= 0 ? end + 1 : 0;
}

export async function resumeYouTubeUpload(
  input: {
    uploadUrl: string;
    accessToken: string;
    media: ShortPublishMedia;
    visibility: "private" | "unlisted" | "public";
    priorOutcomeUnknown?: boolean;
  },
  dependencies: Pick<
    ProviderPublishingDependencies,
    "fetch" | "onProgress" | "wait"
  > = {}
): Promise<ProviderShortPublishResult> {
  const fetchImpl = dependencies.fetch ?? fetch;
  const onProgress = dependencies.onProgress ?? (async () => undefined);
  const wait =
    dependencies.wait ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const uploadUrl = trustedProviderUrl(
    input.uploadUrl,
    "YouTube",
    (hostname) => hostname === "www.googleapis.com"
  );
  const ambiguousUpload = async (message: string, cause?: unknown) => {
    await onProgress({
      status: "submitted",
      externalId: null,
      providerStatus: "UPLOAD_OUTCOME_UNKNOWN",
      visibility: input.visibility,
      providerVisibility: null,
    });
    return new IntegrationPublicationAmbiguousError(message, cause);
  };
  let uploadMayHaveCompleted = input.priorOutcomeUnknown === true;
  const completed = async (response: Response) => {
    let uploaded: Awaited<ReturnType<typeof parseYouTubeUploadResult>>;
    try {
      uploaded = await parseYouTubeUploadResult(response, input.visibility);
    } catch (cause) {
      throw await ambiguousUpload(
        "YouTube accepted the upload but returned no usable video id. Verify the channel before retrying.",
        cause
      );
    }
    await onProgress({
      status: "submitted",
      externalId: uploaded.videoId,
      providerStatus: "UPLOADED_PROCESSING",
      visibility: uploaded.visibility,
      providerVisibility: uploaded.providerVisibility,
    });
    return {
      status: "submitted" as const,
      externalId: uploaded.videoId,
      providerStatus: "UPLOADED_PROCESSING",
      visibility: uploaded.visibility,
      providerVisibility: uploaded.providerVisibility,
    };
  };

  let start = 0;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let probe: Response | null = null;
    try {
      probe = await fetchImpl(uploadUrl, {
        method: "PUT",
        signal: AbortSignal.timeout(PROVIDER_CONTROL_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Length": "0",
          "Content-Range": `bytes */${input.media.bytes.length}`,
        },
      });
    } catch {
      if (attempt === 3) {
        throw await ambiguousUpload(
          "YouTube did not confirm the resumable upload status"
        );
      }
      await wait(500 * 2 ** attempt);
      continue;
    }
    if (probe.status === 201) {
      return completed(probe);
    }
    if (youtubeResumableStatusIsRetryable(probe.status)) {
      const retryAfter = parseRetryAfterMilliseconds(
        probe.headers.get("retry-after")
      );
      await wait(retryAfter ?? 500 * 2 ** attempt);
      continue;
    }
    if (probe.status !== 308) {
      const failure = new IntegrationProviderError(
        "YouTube",
        "upload status probe",
        probe.status,
        probe.status === 401 ? "authorization" : "provider"
      );
      if (probe.status === 401) {
        throw await ambiguousUpload(
          "YouTube authorization expired during a resumable upload",
          failure
        );
      }
      if (probe.status === 404 && uploadMayHaveCompleted) {
        throw await ambiguousUpload(
          "The YouTube upload session expired after an unconfirmed success response. Verify the channel manually; session expiry does not prove that no video was created.",
          failure
        );
      }
      throw new IntegrationPublicationTerminalError(failure.message);
    }
    start = uploadedByteCount(probe);
    if (start >= input.media.bytes.length) continue;

    // A non-empty resumable PUT can create the final video even if this
    // process never receives its 201. Persist and latch that boundary before
    // sending bytes so a crash can only recover the same session or require
    // manual verification, never offer a blind new upload.
    uploadMayHaveCompleted = true;
    await onProgress({
      status: "submitted",
      externalId: null,
      providerStatus: "UPLOAD_REQUEST_SENT",
      visibility: input.visibility,
      providerVisibility: null,
    });
    let response: Response | null = null;
    try {
      const remaining = input.media.bytes.subarray(start);
      response = await fetchImpl(uploadUrl, {
        method: "PUT",
        signal: AbortSignal.timeout(YOUTUBE_UPLOAD_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": input.media.mimeType,
          "Content-Length": String(remaining.length),
          "Content-Range": `bytes ${start}-${input.media.bytes.length - 1}/${input.media.bytes.length}`,
        },
        body: new Uint8Array(remaining),
      });
    } catch {
      if (attempt === 3) {
        throw await ambiguousUpload(
          "YouTube did not confirm the resumable video upload"
        );
      }
      await wait(500 * 2 ** attempt);
      continue;
    }
    if (response.status === 201) {
      return completed(response);
    }
    if (response.status === 308) {
      start = uploadedByteCount(response);
      continue;
    }
    if (youtubeResumableStatusIsRetryable(response.status)) {
      const retryAfter = parseRetryAfterMilliseconds(
        response.headers.get("retry-after")
      );
      await wait(retryAfter ?? 500 * 2 ** attempt);
      continue;
    }
    const failure = new IntegrationProviderError(
      "YouTube",
      "video upload",
      response.status,
      response.status === 401 ? "authorization" : "provider"
    );
    if (response.status === 401) {
      throw await ambiguousUpload(
        "YouTube authorization expired during a resumable upload",
        failure
      );
    }
    throw new IntegrationPublicationTerminalError(failure.message);
  }
  throw await ambiguousUpload(
    "YouTube did not confirm the resumable video upload"
  );
}

export async function publishProviderShort(
  request: ProviderShortPublishRequest,
  dependencies: ProviderPublishingDependencies = {}
): Promise<ProviderShortPublishResult> {
  const fetchImpl = dependencies.fetch ?? fetch;
  const wait =
    dependencies.wait ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const onProgress = dependencies.onProgress ?? (async () => undefined);
  const onRecoverySession =
    dependencies.onRecoverySession ?? (async () => undefined);
  const inspectInstagramMedia =
    dependencies.inspectInstagramMedia ?? inspectInstagramReelMedia;
  if (request.provider === "tiktok") {
    return publishTikTokShort(request, fetchImpl, onProgress);
  }
  if (request.provider === "instagram") {
    return publishInstagramReel(
      request,
      fetchImpl,
      wait,
      onProgress,
      inspectInstagramMedia
    );
  }
  return publishYouTubeShort(
    request,
    fetchImpl,
    onProgress,
    onRecoverySession
  );
}
