import {
  IntegrationAccountBindingError,
  IntegrationAuthorizationUnhealthyError,
  IntegrationMutationSupersededError,
  IntegrationNotConnectedError,
} from "./errors";
import { IntegrationPublicationAmbiguousError } from "./publishing";
import { IntegrationProviderError } from "./providers/http";
import type { IntegrationProviderRuntime } from "./runtime";
import {
  beginProviderMutation,
  commitProviderMutation,
  readIntegrationConnection,
  saveIntegrationConnection,
} from "./store";
import type {
  DecryptedIntegrationConnection,
  IntegrationProvider,
} from "./types";

export function requireAccountId(accountId: string) {
  const expectedAccountId = accountId.trim();
  if (!expectedAccountId) throw new IntegrationAccountBindingError();
  return expectedAccountId;
}

export async function beginAccountMutation(
  provider: IntegrationProvider,
  accountId: string,
  runtime: IntegrationProviderRuntime
) {
  return beginProviderMutation(
    provider,
    (lockedStorage) =>
      readIntegrationConnection(
        provider,
        accountId,
        runtime.encryptionKey,
        lockedStorage
      ),
    runtime.storage
  );
}

export async function requireConnectedAccount(
  provider: IntegrationProvider,
  accountId: string,
  runtime: IntegrationProviderRuntime
) {
  const mutation = await beginAccountMutation(provider, accountId, runtime);
  const existing = mutation.snapshot;
  if (!existing) throw new IntegrationNotConnectedError();
  return { mutation, existing };
}

export async function commitSavedConnection(
  provider: IntegrationProvider,
  revision: number,
  connection: DecryptedIntegrationConnection,
  runtime: IntegrationProviderRuntime
) {
  const committed = await commitProviderMutation(
    provider,
    revision,
    (lockedStorage) =>
      saveIntegrationConnection(
        connection,
        runtime.encryptionKey,
        lockedStorage
      ),
    runtime.storage
  );
  if (!committed.committed) {
    throw new IntegrationMutationSupersededError();
  }
  return committed;
}

export async function refreshIfNeeded(
  connection: DecryptedIntegrationConnection,
  runtime: IntegrationProviderRuntime
) {
  const expiresAt = connection.tokens.expiresAt
    ? new Date(connection.tokens.expiresAt).getTime()
    : Number.POSITIVE_INFINITY;
  if (expiresAt > runtime.now.getTime() + 60_000) return connection;

  const refreshed = await runtime.adapter.refreshTokens(
    runtime.config,
    connection.tokens,
    { fetch: runtime.fetch, now: runtime.now }
  );
  const next: DecryptedIntegrationConnection = {
    ...connection,
    grantedScopes:
      refreshed.grantedScopes.length > 0
        ? refreshed.grantedScopes
        : connection.grantedScopes,
    tokens: refreshed,
    updatedAt: runtime.now.toISOString(),
    authorization: {
      status: "healthy",
      lastCheckedAt: runtime.now.toISOString(),
    },
  };
  return next;
}

export function isAuthorizationFailure(cause: unknown) {
  return (
    (cause instanceof IntegrationPublicationAmbiguousError &&
      cause.authorizationFailure) ||
    (cause instanceof IntegrationProviderError &&
      cause.kind === "authorization") ||
    (cause instanceof Error &&
      /refresh token is missing|invalid[_ -]?grant|invalid[_ -]?token/i.test(
        cause.message
      ))
  );
}

export async function persistAuthorizationFailure(
  provider: IntegrationProvider,
  current: DecryptedIntegrationConnection,
  revision: number,
  runtime: IntegrationProviderRuntime
): Promise<never> {
  const failed: DecryptedIntegrationConnection = {
    ...current,
    updatedAt: runtime.now.toISOString(),
    authorization: {
      status: "reauthorization_required",
      lastCheckedAt: runtime.now.toISOString(),
    },
  };
  await commitSavedConnection(provider, revision, failed, runtime);
  throw new IntegrationAuthorizationUnhealthyError();
}
