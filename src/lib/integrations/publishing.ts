import { inspectInstagramReelMedia } from "./instagram-media-probe";
import { IntegrationProviderError } from "./providers/http";
import {
  parseRetryAfterMilliseconds,
  PROVIDER_CONTROL_TIMEOUT_MS,
  trustedProviderUrl,
  YOUTUBE_UPLOAD_TIMEOUT_MS,
} from "./publishing-http";
import { publishInstagramReel } from "./publishing-instagram";
import { publishTikTokShort } from "./publishing-tiktok";
import {
  IntegrationPublicationAmbiguousError,
  IntegrationPublicationTerminalError,
  type ProviderPublishingDependencies,
  type ProviderShortPublishRequest,
  type ProviderShortPublishResult,
  type ShortPublishMedia,
} from "./publishing-types";
import { initializeYouTubeShortUpload } from "./publishing-youtube";

export { parseRetryAfterMilliseconds };
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

const YOUTUBE_RESUMABLE_RETRYABLE_STATUSES = new Set([
  500, 502, 503, 504,
]);

export function youtubeResumableStatusIsRetryable(status: number) {
  return YOUTUBE_RESUMABLE_RETRYABLE_STATUSES.has(status);
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
    case "youtube": {
      const session = await initializeYouTubeShortUpload(
        request,
        fetchImpl,
        onProgress,
        onRecoverySession
      );
      return resumeYouTubeUpload(
        {
          uploadUrl: session.uploadUrl,
          accessToken: request.accessToken,
          media: request.media,
          visibility: session.visibility,
        },
        { fetch: fetchImpl, onProgress, wait }
      );
    }
    default: {
      const _exhaustive: never = request.provider;
      return _exhaustive;
    }
  }
}
