import type { EncryptedIntegrationSecret } from "./crypto";
import type {
  DecryptedIntegrationConnection,
  IntegrationProvider,
  PublicOwnedPostMetric,
  YouTubePolicyAcceptance,
} from "./types";

export type StoredConnection = Omit<DecryptedIntegrationConnection, "tokens"> & {
  tokens: {
    accessToken: EncryptedIntegrationSecret;
    refreshToken: EncryptedIntegrationSecret | null;
    expiresAt: string | null;
    refreshTokenExpiresAt: string | null;
    grantedScopes: string[];
    tokenType: string | null;
  };
};

export type StoredProviderMetrics = {
  version: 1;
  provider: IntegrationProvider;
  posts: PublicOwnedPostMetric[];
  syncedAt: string;
};

export type StoredOAuthStateRecord = {
  version: 1;
  provider: IntegrationProvider;
  expiresAt: string;
  youtubePolicyAcceptance?: YouTubePolicyAcceptance;
};

export function connectionKey(provider: IntegrationProvider, accountId: string) {
  return `integrations/connections/${provider}/${accountId}.json`;
}

export function metricsKey(provider: IntegrationProvider, accountId: string) {
  return `integrations/metrics/${provider}/${accountId}.json`;
}

/** Legacy single-connection-per-provider key; removed by migrateLegacyProviderConnections. */
export function legacyConnectionKey(provider: IntegrationProvider) {
  return `integrations/connections/${provider}.json`;
}

/** Legacy single-metrics-per-provider key; removed by migrateLegacyProviderConnections. */
export function legacyMetricsKey(provider: IntegrationProvider) {
  return `integrations/metrics/${provider}.json`;
}

export function stateKey(nonceHash: string) {
  return `integrations/oauth-state/${nonceHash}.json`;
}

export function publishSessionKey(attemptId: string) {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(attemptId)) {
    throw new Error("Publish attempt id is invalid");
  }
  return `integrations/publish-sessions/youtube/${attemptId}.json`;
}

export function encode(value: unknown) {
  return Uint8Array.from(Buffer.from(JSON.stringify(value), "utf8"));
}

export function decode<T>(data: Uint8Array): T {
  return JSON.parse(Buffer.from(data).toString("utf8")) as T;
}

export function validProviderAccountId(accountId: string) {
  return accountId.length > 0 && accountId.length <= 256;
}
