import { isWellFormedUnicode, unicodeCodePointLength } from "../unicode";
import { IntegrationProviderError, providerJson } from "./providers/http";
import type { ProviderFetch } from "./providers/types";
import {
  providerBinaryRequest,
  trustedProviderUrl,
} from "./publishing-http";
import { validateCommonMedia } from "./publishing-limits";
import {
  IntegrationMediaValidationError,
  type ProviderPublicationStatus,
  type ProviderPublishProgress,
  type ProviderShortPublishRequest,
  type ShortPublishMedia,
} from "./publishing-types";

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

export async function initializeYouTubeShortUpload(
  request: ProviderShortPublishRequest,
  fetchImpl: ProviderFetch,
  onProgress: (progress: ProviderPublishProgress) => Promise<void>,
  onRecoverySession: (uploadUrl: string) => Promise<void>
): Promise<{
  uploadUrl: string;
  visibility: "private" | "unlisted" | "public";
}> {
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
  return { uploadUrl, visibility };
}
