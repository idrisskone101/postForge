import type { ProviderOAuthConfig } from "./config";
import { InstagramMediaProbeError } from "./instagram-media-probe";
import { IntegrationProviderError, providerJson } from "./providers/http";
import type { ProviderFetch } from "./providers/types";
import { publicAssetUrl } from "./publishing-http";
import { exactCaption, validateCommonMedia } from "./publishing-limits";
import {
  IntegrationMediaValidationError,
  IntegrationPublicationAmbiguousError,
  IntegrationPublicationTerminalError,
  type ProviderPublishingDependencies,
  type ProviderPublishProgress,
  type ProviderShortPublishRequest,
  type ProviderShortPublishResult,
  type ShortPublishMedia,
} from "./publishing-types";
import type { IntegrationAccount } from "./types";

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

export async function publishInstagramReel(
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
