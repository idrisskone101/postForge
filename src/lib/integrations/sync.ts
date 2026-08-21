import { IntegrationProviderError } from "./providers/http";
import {
  IntegrationAccountBindingError,
  IntegrationMutationSupersededError,
  IntegrationSyncError,
} from "./errors";
import {
  refreshIfNeeded,
  requireAccountId,
  requireConnectedAccount,
} from "./account-mutation";
import { getPublicIntegrationStatus } from "./account-status";
import { providerRuntime } from "./runtime";
import type { IntegrationServiceDependencies } from "./runtime";
import { assertYouTubePolicyConsent } from "./youtube-policy";
import {
  commitProviderMutation,
  deleteProviderMetrics,
  saveIntegrationConnection,
  saveProviderMetrics,
} from "./store";
import type {
  DecryptedIntegrationConnection,
  IntegrationProvider,
  IntegrationSyncResponse,
} from "./types";

export async function syncIntegrationAccount(
  provider: IntegrationProvider,
  accountId: string,
  input: IntegrationServiceDependencies = {}
): Promise<IntegrationSyncResponse> {
  const expectedAccountId = requireAccountId(accountId);
  const runtime = providerRuntime(provider, input);
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
  const attemptAt = runtime.now.toISOString();
  let current = existing;

  try {
    current = await refreshIfNeeded(existing, runtime);
    if (current.account.id !== expectedAccountId) {
      throw new IntegrationAccountBindingError();
    }
    const account = await runtime.adapter.fetchAccount(
      runtime.config,
      current.tokens.accessToken,
      { fetch: runtime.fetch, now: runtime.now }
    );
    current = {
      ...current,
      account,
      authorization: {
        status: "healthy",
        lastCheckedAt: attemptAt,
      },
    };
    const warnings: string[] = [];
    const posts = await runtime.adapter.syncOwnedPosts(
      runtime.config,
      current.tokens.accessToken,
      account,
      current.grantedScopes,
      {
        fetch: runtime.fetch,
        now: runtime.now,
        onWarning: (warning) => {
          if (!warnings.includes(warning)) warnings.push(warning);
        },
      }
    );
    const next: DecryptedIntegrationConnection = {
      ...current,
      account,
      updatedAt: attemptAt,
      sync: {
        status: warnings.length > 0 ? "partial" : "ready",
        lastAttemptAt: attemptAt,
        lastSuccessfulAt: attemptAt,
        warnings,
      },
    };
    const committed = await commitProviderMutation(
      provider,
      mutation.revision,
      async (lockedStorage) => {
        await saveIntegrationConnection(
          next,
          runtime.encryptionKey,
          lockedStorage
        );
        await saveProviderMetrics(
          { version: 1, provider, posts, syncedAt: attemptAt },
          expectedAccountId,
          lockedStorage
        );
      },
      runtime.storage
    );
    if (!committed.committed) {
      throw new IntegrationMutationSupersededError();
    }
    return {
      provider: await getPublicIntegrationStatus(provider, input),
      accountId: expectedAccountId,
      posts,
      syncedAt: attemptAt,
    };
  } catch (cause) {
    if (cause instanceof IntegrationMutationSupersededError) throw cause;
    const authorizationFailed =
      (cause instanceof IntegrationProviderError &&
        cause.kind === "authorization") ||
      (cause instanceof Error &&
        /refresh token is missing|invalid[_ -]?grant|invalid[_ -]?token/i.test(
          cause.message
        ));
    const failed: DecryptedIntegrationConnection = {
      ...current,
      updatedAt: attemptAt,
      authorization: authorizationFailed
        ? {
            status: "reauthorization_required",
            lastCheckedAt: attemptAt,
          }
        : (current.authorization ?? {
            status: "unknown",
            lastCheckedAt: null,
          }),
      sync: {
        ...current.sync,
        status: "error",
        lastAttemptAt: attemptAt,
        warnings: authorizationFailed
          ? ["Provider authorization is no longer valid. Reconnect the account."]
          : ["The latest provider sync failed; previously stored metrics were kept."],
      },
    };
    const committed = await commitProviderMutation(
      provider,
      mutation.revision,
      async (lockedStorage) => {
        await saveIntegrationConnection(
          failed,
          runtime.encryptionKey,
          lockedStorage
        );
        if (authorizationFailed) {
          await deleteProviderMetrics(provider, expectedAccountId, lockedStorage);
        }
      },
      runtime.storage
    );
    if (!committed.committed) {
      throw new IntegrationMutationSupersededError();
    }
    throw new IntegrationSyncError();
  }
}
