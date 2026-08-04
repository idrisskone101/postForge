import {
  INTEGRATION_PROVIDERS,
  type IntegrationPerformanceResponse,
  type IntegrationProvider,
  type IntegrationSyncResponse,
  type IntegrationsResponse,
  type OwnedPostMetrics,
  type PublicIntegrationAccount,
  type PublicIntegrationStatus,
  type PublicOwnedPostMetric,
} from "./integrations/types";

export const SOCIAL_PROVIDERS = INTEGRATION_PROVIDERS;
export type SocialProvider = IntegrationProvider;
export type ProviderPostMetrics = OwnedPostMetrics;
export type ProviderOwnedPost = PublicOwnedPostMetric;
export type {
  IntegrationPerformanceResponse,
  IntegrationsResponse,
  PublicIntegrationAccount,
  PublicIntegrationStatus,
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string; message?: string })
    | null;
  if (!response.ok) {
    throw new Error(
      payload?.error || payload?.message || `Integration request failed (${response.status}).`
    );
  }
  if (!payload) throw new Error("Integration service returned an empty response.");
  return payload;
}

export async function fetchIntegrations(options?: { signal?: AbortSignal }) {
  return parseResponse<IntegrationsResponse>(
    await fetch("/api/integrations", {
      cache: "no-store",
      signal: options?.signal,
    })
  );
}

export async function fetchIntegrationPerformance(options?: {
  signal?: AbortSignal;
}) {
  return parseResponse<IntegrationPerformanceResponse>(
    await fetch("/api/integrations/performance", {
      cache: "no-store",
      signal: options?.signal,
    })
  );
}

export async function syncIntegration(provider: SocialProvider) {
  return parseResponse<IntegrationSyncResponse>(
    await fetch(`/api/integrations/${provider}/sync`, { method: "POST" })
  );
}

export async function beginIntegrationConnection(
  provider: SocialProvider,
  options: { acceptPolicies: boolean }
) {
  return parseResponse<{ authorizationUrl: string }>(
    await fetch(`/api/integrations/${provider}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    })
  );
}

export const LOCAL_INTEGRATION_DELETE_CONFIRMATION = "DELETE LOCAL DATA";

export async function disconnectIntegration(
  provider: SocialProvider,
  options?: { forceLocalDelete?: boolean; confirmation?: string }
) {
  return parseResponse<{
    provider: PublicIntegrationStatus;
    disconnected: true;
    localDataDeleted: boolean;
    remoteRevocationConfirmed: boolean;
  }>(
    await fetch(`/api/integrations/${provider}/disconnect`, {
      method: "POST",
      ...(options?.forceLocalDelete
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(options),
          }
        : {}),
    })
  );
}

export function integrationAccountKey(
  provider: SocialProvider,
  accountId: string
) {
  return `account:${provider}:${accountId}`;
}
