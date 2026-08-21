import { IntegrationProviderError, providerJson } from "./providers/http";
import type { ProviderFetch } from "./providers/types";
import { publicAssetUrl } from "./publishing-http";
import { exactCaption, validateCommonMedia } from "./publishing-limits";
import {
  IntegrationMediaValidationError,
  IntegrationPublicationAmbiguousError,
  IntegrationPublicationTerminalError,
  TIKTOK_PRIVACY_LEVELS,
  type ProviderPublishProgress,
  type ProviderShortPublishRequest,
  type ProviderShortPublishResult,
  type ProviderVisibility,
  type ShortPublishMedia,
  type TikTokCreatorPublishingInfo,
  type TikTokPrivacyLevel,
  type TikTokPublishStatus,
} from "./publishing-types";

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

export async function publishTikTokShort(
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
