import { deriveCapabilities } from "./config";
import { createSignedPublishMediaUrl } from "./publish-media";
import {
  IntegrationAccountBindingError,
  IntegrationAuthorizationUnhealthyError,
  IntegrationMutationSupersededError,
  IntegrationNotConnectedError,
  IntegrationPublishScopeError,
} from "./errors";
import {
  beginAccountMutation,
  commitSavedConnection,
  isAuthorizationFailure,
  persistAuthorizationFailure,
  refreshIfNeeded,
  requireAccountId,
} from "./account-mutation";
import { providerRuntime } from "./runtime";
import type { IntegrationServiceDependencies } from "./runtime";
import { assertYouTubePolicyConsent } from "./youtube-policy";
import {
  IntegrationMediaValidationError,
  IntegrationPublicationTerminalError,
  publishProviderShort,
  type ProviderPublishProgress,
  type ProviderShortPublishResult,
  type ShortPublishMedia,
  type TikTokPublishSettings,
  type YouTubePublishSettings,
} from "./publishing";
import {
  deleteYouTubePublishSession,
  saveYouTubePublishSession,
} from "./store";
import type {
  DecryptedIntegrationConnection,
  IntegrationProvider,
} from "./types";

export async function publishIntegrationShort(
  provider: IntegrationProvider,
  input: {
    expectedAccountId: string;
    attemptId: string;
    media: ShortPublishMedia;
    caption: string;
    tiktokSettings?: TikTokPublishSettings;
    youtubeSettings?: YouTubePublishSettings;
    onProgress?: (progress: ProviderPublishProgress) => Promise<void>;
  },
  dependenciesInput: IntegrationServiceDependencies = {}
): Promise<ProviderShortPublishResult> {
  const expectedAccountId = requireAccountId(input.expectedAccountId);
  const attemptId = input.attemptId.trim();
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(attemptId)) {
    throw new IntegrationMediaValidationError("Publish attempt id is invalid");
  }

  const runtime = providerRuntime(provider, dependenciesInput);
  const mutation = await beginAccountMutation(
    provider,
    expectedAccountId,
    runtime
  );
  const existing = mutation.snapshot;
  if (!existing) throw new IntegrationNotConnectedError();
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
  } catch (cause) {
    if (
      cause instanceof IntegrationMutationSupersededError ||
      cause instanceof IntegrationPublishScopeError ||
      cause instanceof IntegrationAccountBindingError
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

  try {
    const media =
      provider === "youtube"
        ? input.media
        : {
            ...input.media,
            publicUrl: createSignedPublishMediaUrl({
              publicUrl: runtime.config.publicUrl,
              assetId: input.media.id,
              provider,
              encryptionKey: runtime.encryptionKey,
              now: runtime.now,
            }),
          };
    const result = await publishProviderShort(
      {
        provider,
        config: runtime.config,
        accessToken: current.tokens.accessToken,
        account: current.account,
        media,
        caption: input.caption,
        tiktokSettings: input.tiktokSettings,
        youtubeSettings: input.youtubeSettings,
      },
      {
        fetch: runtime.fetch,
        wait: runtime.wait,
        onProgress: input.onProgress,
        onRecoverySession:
          provider === "youtube"
            ? (uploadUrl) =>
                saveYouTubePublishSession(
                  attemptId,
                  uploadUrl,
                  runtime.encryptionKey,
                  runtime.storage
                )
            : undefined,
      }
    );
    if (provider === "youtube" && result.externalId) {
      await deleteYouTubePublishSession(attemptId, runtime.storage);
    }
    return result;
  } catch (cause) {
    if (cause instanceof IntegrationPublicationTerminalError) {
      if (provider === "youtube") {
        await deleteYouTubePublishSession(attemptId, runtime.storage);
      }
      throw cause;
    }
    if (isAuthorizationFailure(cause)) {
      const authorizationMutation = await beginAccountMutation(
        provider,
        expectedAccountId,
        runtime
      );
      const latest = authorizationMutation.snapshot;
      if (
        !latest ||
        latest.account.id !== expectedAccountId ||
        latest.tokens.accessToken !== current.tokens.accessToken
      ) {
        throw new IntegrationMutationSupersededError();
      }
      await persistAuthorizationFailure(
        provider,
        latest,
        authorizationMutation.revision,
        runtime
      );
    }
    throw cause;
  }
}
