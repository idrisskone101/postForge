import {
  assertReconnectCompatibleWithPublications,
  UnresolvedPublicationConflictError,
  unresolvedPublications,
} from "../publication-lifecycle";
import { deriveCapabilities } from "./config";
import {
  IntegrationMutationSupersededError,
  YouTubePolicyConsentRequiredError,
} from "./errors";
import {
  applyPublishingRuntimeReadiness,
  toAccountStatus,
  unconnectedStatus,
} from "./account-status";
import { createOAuthState, verifyOAuthState } from "./state";
import {
  providerRuntime,
  withIntegrationPublicationRecords,
  type IntegrationServiceDependencies,
} from "./runtime";
import {
  beginProviderMutation,
  commitProviderMutation,
  consumeOAuthStateRecord,
  deleteProviderMetrics,
  pruneExpiredOAuthStateRecords,
  readIntegrationConnection,
  saveIntegrationConnection,
  saveOAuthStateRecord,
} from "./store";
import type {
  DecryptedIntegrationConnection,
  IntegrationProvider,
  YouTubePolicyAcceptance,
} from "./types";
import {
  YOUTUBE_TERMS_OF_SERVICE_URL,
  youtubeComplianceStatus,
  youtubeConsentStateIsCurrent,
  youtubePolicyAcceptanceMatches,
} from "./youtube-policy";

export async function beginOAuthConnection(
  provider: IntegrationProvider,
  input: IntegrationServiceDependencies = {}
) {
  const runtime = providerRuntime(provider, input);
  let youtubePolicyAcceptance: YouTubePolicyAcceptance | undefined;
  if (provider === "youtube") {
    const complianceUrls = runtime.config.youtubeComplianceUrls;
    if (!runtime.youtubePolicyConsent || !complianceUrls) {
      throw new YouTubePolicyConsentRequiredError();
    }
    youtubePolicyAcceptance = {
      version: 1,
      acceptedAt: runtime.now.toISOString(),
      privacyPolicyUrl: complianceUrls.privacyPolicy,
      termsUrl: complianceUrls.terms,
      dataDeletionUrl: complianceUrls.dataDeletion,
      youtubeTermsOfServiceUrl: YOUTUBE_TERMS_OF_SERVICE_URL,
    };
  }
  const created = createOAuthState(provider, runtime.encryptionKey, {
    now: runtime.now,
  });
  await pruneExpiredOAuthStateRecords(runtime.now, runtime.storage);
  await saveOAuthStateRecord(
    created.nonceHash,
    {
      ...created.record,
      ...(youtubePolicyAcceptance ? { youtubePolicyAcceptance } : {}),
    },
    runtime.storage
  );
  return {
    authorizationUrl: runtime.adapter.buildAuthorizationUrl(
      runtime.config,
      created.state
    ),
    state: created,
  };
}

export async function consumeProviderOAuthState(
  provider: IntegrationProvider,
  state: string | null,
  cookieValue: string | null,
  input: IntegrationServiceDependencies = {}
) {
  const runtime = providerRuntime(provider, input);
  const verified = verifyOAuthState({
    provider,
    state,
    cookieValue,
    signingKey: runtime.encryptionKey,
    now: runtime.now,
  });
  const isSingleUse = await consumeOAuthStateRecord(
    verified.nonceHash,
    provider,
    runtime.now,
    runtime.storage
  );
  if (!isSingleUse) {
    throw new Error("OAuth state has already been used");
  }
  if (
    provider === "youtube" &&
    !youtubePolicyAcceptanceMatches(
      isSingleUse.youtubePolicyAcceptance,
      runtime.config.youtubeComplianceUrls
    )
  ) {
    throw new YouTubePolicyConsentRequiredError();
  }
  return isSingleUse;
}

export async function completeOAuthConnection(
  provider: IntegrationProvider,
  code: string,
  input: IntegrationServiceDependencies = {}
) {
  const runtime = providerRuntime(provider, input);
  const youtubePolicyAcceptance =
    provider === "youtube"
      ? youtubeConsentStateIsCurrent(
          runtime.consumedOAuthState,
          runtime.config.youtubeComplianceUrls,
          runtime.now
        )
        ? runtime.consumedOAuthState?.youtubePolicyAcceptance ?? null
        : null
      : null;
  if (provider === "youtube" && !youtubePolicyAcceptance) {
    throw new YouTubePolicyConsentRequiredError();
  }
  const mutation = await beginProviderMutation(
    provider,
    async () => null,
    runtime.storage
  );
  const tokens = await runtime.adapter.exchangeCode(runtime.config, code, {
    fetch: runtime.fetch,
    now: runtime.now,
  });
  const account = await runtime.adapter.fetchAccount(
    runtime.config,
    tokens.accessToken,
    { fetch: runtime.fetch, now: runtime.now }
  );
  const scopes = [...tokens.grantedScopes];
  if (
    provider === "instagram" &&
    !scopes.includes("instagram_business_basic")
  ) {
    // A successful /me response proves the basic permission even when the
    // token response omits its permissions field. Elevated scopes stay false.
    scopes.push("instagram_business_basic");
  }
  const now = runtime.now.toISOString();
  const connection: DecryptedIntegrationConnection = {
    version: 1,
    provider,
    account,
    grantedScopes: scopes,
    tokens: { ...tokens, grantedScopes: scopes },
    connectedAt: now,
    updatedAt: now,
    authorization: {
      status: "healthy",
      lastCheckedAt: now,
    },
    sync: {
      status: "never",
      lastAttemptAt: null,
      lastSuccessfulAt: null,
      warnings: [],
    },
    youtubePolicyAcceptance,
  };
  const persistCompatibleConnection = () =>
    withIntegrationPublicationRecords(runtime, async (records) => {
      const existing = await readIntegrationConnection(
        provider,
        account.id,
        runtime.encryptionKey,
        runtime.storage
      );
      // Replacing the same account: the new grant must remain compatible with
      // any unresolved publications bound to that account.
      if (existing) {
        assertReconnectCompatibleWithPublications(
          records,
          provider,
          account.id,
          deriveCapabilities(provider, scopes).publish
        );
      } else if (
        unresolvedPublications(records).some(
          (publication) => publication.provider === provider && publication.accountId === account.id
        )
      ) {
        // A brand-new account is not blocked by unresolved publications bound
        // to other connected accounts; only an unresolved publication that
        // somehow references this exact new account id is a conflict.
        assertReconnectCompatibleWithPublications(
          records,
          provider,
          account.id,
          deriveCapabilities(provider, scopes).publish
        );
      }
      return commitProviderMutation(
        provider,
        mutation.revision,
        async (lockedStorage) => {
          await saveIntegrationConnection(
            connection,
            runtime.encryptionKey,
            lockedStorage
          );
          await deleteProviderMetrics(provider, account.id, lockedStorage);
        },
        runtime.storage
      );
    });
  let committed: Awaited<ReturnType<typeof persistCompatibleConnection>>;
  try {
    committed = await persistCompatibleConnection();
  } catch (cause) {
    if (cause instanceof UnresolvedPublicationConflictError) {
      try {
        await runtime.adapter.revokeAccess(
          runtime.config,
          connection.tokens,
          connection.account,
          { fetch: runtime.fetch, now: runtime.now }
        );
      } catch {
        // The incompatible grant was never persisted. Keep the old local
        // connection so the unresolved publication remains recoverable.
      }
    }
    throw cause;
  }
  if (!committed.committed) {
    // The callback obtained a provider token after a newer disconnect won the
    // durable revision. Revoke that uncommitted grant best-effort so it cannot
    // become an orphaned provider-side connection, but never recreate local
    // state just to retain it.
    try {
      await runtime.adapter.revokeAccess(
        runtime.config,
        connection.tokens,
        connection.account,
        { fetch: runtime.fetch, now: runtime.now }
      );
    } catch {
      // The request still remains superseded. Provider cleanup can be retried
      // only by reconnecting and explicitly disconnecting the resulting grant.
    }
    throw new IntegrationMutationSupersededError();
  }
  // Keep the OAuth callback bounded to token exchange and account discovery.
  // Providers such as Instagram can require one insight request per post, so
  // the explicit sync endpoint owns metrics ingestion after connection.
  return {
    ...unconnectedStatus(provider, true, runtime.config.youtubeComplianceUrls),
    ...(provider === "youtube"
      ? {
          youtubeCompliance: youtubeComplianceStatus(
            provider,
            runtime.config.youtubeComplianceUrls,
            connection
          ),
        }
      : {}),
    connected: true,
    accountCount: 1,
    accounts: [
      await applyPublishingRuntimeReadiness(
        provider,
        toAccountStatus(
          provider,
          connection,
          provider === "youtube" &&
            !youtubePolicyAcceptanceMatches(
              connection.youtubePolicyAcceptance,
              runtime.config.youtubeComplianceUrls
            )
        ),
        runtime.env
      ),
    ],
  };
}
