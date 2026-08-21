import { deriveCapabilities } from "./config";
import {
  IntegrationAccountBindingError,
  IntegrationAuthorizationUnhealthyError,
  IntegrationMutationSupersededError,
  IntegrationPublishScopeError,
} from "./errors";
import {
  commitSavedConnection,
  isAuthorizationFailure,
  persistAuthorizationFailure,
  refreshIfNeeded,
  requireAccountId,
  requireConnectedAccount,
} from "./account-mutation";
import { providerRuntime } from "./runtime";
import type { IntegrationServiceDependencies } from "./runtime";
import { assertYouTubePolicyConsent } from "./youtube-policy";
import {
  IntegrationMediaValidationError,
  IntegrationPublicationAmbiguousError,
  IntegrationPublicationTerminalError,
  queryTikTokPublishStatus,
  queryYouTubePublishStatus,
  resumeInstagramReel,
  resumeYouTubeUpload,
  type ProviderPublicationStatus,
  type ProviderPublishProgress,
  type ProviderVisibility,
  type ShortPublishMedia,
} from "./publishing";
import {
  deleteYouTubePublishSession,
  readYouTubePublishSession,
} from "./store";
import type { IntegrationProvider } from "./types";

export async function refreshIntegrationPublicationStatus(
  provider: IntegrationProvider,
  input: {
    expectedAccountId: string;
    attemptId: string;
    externalId: string | null;
    media?: ShortPublishMedia;
    visibility?: ProviderVisibility;
    providerStatus?: string | null;
    onProgress?: (progress: ProviderPublishProgress) => Promise<void>;
  },
  dependenciesInput: IntegrationServiceDependencies = {}
): Promise<ProviderPublicationStatus> {
  const expectedAccountId = requireAccountId(input.expectedAccountId);
  const externalId = input.externalId?.trim() ?? "";
  if (!externalId && provider !== "youtube") {
    throw new IntegrationMediaValidationError(
      "The provider did not return an id that can be checked"
    );
  }
  const runtime = providerRuntime(provider, dependenciesInput);
  const { mutation, existing } = await requireConnectedAccount(
    provider,
    expectedAccountId,
    runtime
  );
  assertYouTubePolicyConsent(
    provider,
    existing,
    runtime.config.youtubeComplianceUrls
  );
  if (existing.authorization.status !== "healthy") {
    throw new IntegrationAuthorizationUnhealthyError();
  }
  let current = existing;
  try {
    current = await refreshIfNeeded(existing, runtime);
    if (!deriveCapabilities(provider, current.grantedScopes).publish) {
      throw new IntegrationPublishScopeError();
    }
    const account = await runtime.adapter.fetchAccount(
      runtime.config,
      current.tokens.accessToken,
      { fetch: runtime.fetch, now: runtime.now }
    );
    const checkedAt = runtime.now.toISOString();
    current = {
      ...current,
      account,
      updatedAt: checkedAt,
      authorization: { status: "healthy", lastCheckedAt: checkedAt },
    };
    await commitSavedConnection(
      provider,
      mutation.revision,
      current,
      runtime
    );
    if (account.id !== expectedAccountId) {
      throw new IntegrationAccountBindingError();
    }
    if (provider === "youtube" && !externalId) {
      if (!input.media) {
        throw new IntegrationMediaValidationError(
          "The approved video is unavailable for YouTube upload recovery"
        );
      }
      const uploadUrl = await readYouTubePublishSession(
        input.attemptId,
        runtime.encryptionKey,
        runtime.storage
      );
      if (!uploadUrl) {
        throw new IntegrationMediaValidationError(
          "The YouTube resumable upload session is unavailable"
        );
      }
      const result = await resumeYouTubeUpload(
        {
          uploadUrl,
          accessToken: current.tokens.accessToken,
          media: input.media,
          visibility:
            input.visibility === "unlisted" || input.visibility === "public"
              ? input.visibility
              : "private",
          priorOutcomeUnknown:
            input.providerStatus === "UPLOAD_OUTCOME_UNKNOWN" ||
            input.providerStatus === "UPLOAD_REQUEST_SENT",
        },
        {
          fetch: runtime.fetch,
          wait: runtime.wait,
          onProgress: input.onProgress,
        }
      );
      if (result.externalId) {
        await deleteYouTubePublishSession(input.attemptId, runtime.storage);
      }
      return {
        status: "processing",
        providerStatus: result.providerStatus,
        visibility: result.visibility,
        providerVisibility: result.providerVisibility,
      };
    }
    if (provider === "instagram") {
      if (
        input.providerStatus === "PUBLISH_REQUEST_SENT" ||
        input.providerStatus === "PUBLISH_OUTCOME_UNKNOWN"
      ) {
        throw new IntegrationPublicationAmbiguousError(
          "Instagram did not confirm the media_publish outcome. Verify the Reel on the connected account; automatic resubmission is disabled to prevent a duplicate."
        );
      }
      const result = await resumeInstagramReel(
        {
          config: runtime.config,
          accessToken: current.tokens.accessToken,
          account: current.account,
          containerId: externalId,
        },
        {
          fetch: runtime.fetch,
          wait: runtime.wait,
          onProgress: input.onProgress,
        }
      );
      return {
        status: result.status === "published" ? "published" : "processing",
        providerStatus: result.providerStatus,
        visibility: result.visibility,
        providerVisibility: result.providerVisibility,
      };
    }
    return provider === "tiktok"
      ? queryTikTokPublishStatus(
          current.tokens.accessToken,
          externalId,
          runtime.fetch
        )
      : queryYouTubePublishStatus(
          current.tokens.accessToken,
          externalId,
          runtime.fetch
        );
  } catch (cause) {
    if (cause instanceof IntegrationPublicationTerminalError) {
      if (provider === "youtube") {
        await deleteYouTubePublishSession(input.attemptId, runtime.storage);
      }
      return { status: "failed", providerStatus: "FAILED" };
    }
    if (
      cause instanceof IntegrationMutationSupersededError ||
      cause instanceof IntegrationPublishScopeError ||
      cause instanceof IntegrationAccountBindingError ||
      cause instanceof IntegrationMediaValidationError
    ) {
      throw cause;
    }
    if (isAuthorizationFailure(cause)) {
      await persistAuthorizationFailure(
        provider,
        current,
        mutation.revision,
        runtime
      );
    }
    throw cause;
  }
}
