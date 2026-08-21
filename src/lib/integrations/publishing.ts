import { inspectInstagramReelMedia } from "./instagram-media-probe";
import { publishInstagramReel } from "./publishing-instagram";
import { publishTikTokShort } from "./publishing-tiktok";
import type {
  ProviderPublishingDependencies,
  ProviderShortPublishRequest,
  ProviderShortPublishResult,
} from "./publishing-types";
import { publishYouTubeShort } from "./publishing-youtube";

export { parseRetryAfterMilliseconds } from "./publishing-http";
export { resumeInstagramReel } from "./publishing-instagram";
export { assertSocialPublishMediaSizeBytes } from "./publishing-limits";
export {
  queryTikTokCreatorPublishingInfo,
  queryTikTokPublishStatus,
} from "./publishing-tiktok";
export {
  IntegrationMediaValidationError,
  IntegrationPublicationAmbiguousError,
  IntegrationPublicationTerminalError,
  MAX_SOCIAL_PUBLISH_MEDIA_BYTES,
  TIKTOK_PRIVACY_LEVELS,
  type ProviderPublicationStatus,
  type ProviderPublishProgress,
  type ProviderPublishingDependencies,
  type ProviderShortPublishRequest,
  type ProviderShortPublishResult,
  type ProviderVisibility,
  type ShortPublishMedia,
  type TikTokCreatorPublishingInfo,
  type TikTokPrivacyLevel,
  type TikTokPublishSettings,
  type TikTokPublishStatus,
  type YouTubePublishSettings,
} from "./publishing-types";
export { queryYouTubePublishStatus } from "./publishing-youtube";
export {
  resumeYouTubeUpload,
  youtubeResumableStatusIsRetryable,
} from "./publishing-youtube-resume";

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
  switch (request.provider) {
    case "tiktok":
      return publishTikTokShort(request, fetchImpl, onProgress);
    case "instagram":
      return publishInstagramReel(
        request,
        fetchImpl,
        wait,
        onProgress,
        inspectInstagramMedia
      );
    case "youtube":
      return publishYouTubeShort(
        request,
        fetchImpl,
        onProgress,
        onRecoverySession
      );
    default: {
      const _exhaustive: never = request.provider;
      return _exhaustive;
    }
  }
}
