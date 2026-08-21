import {
  INTEGRATION_PROVIDERS,
  type IntegrationPerformanceResponse,
  type IntegrationProvider,
} from "./types";
import { getIntegrationsResponse } from "./account-status";
import { dependencies } from "./runtime";
import type { IntegrationServiceDependencies } from "./runtime";
import { youtubeProviderDataIsFresh } from "./youtube-policy";
import {
  deleteProviderMetrics,
  listProviderMetricRecords,
  type StoredProviderMetrics,
} from "./store";

export async function getIntegrationPerformanceResponse(
  input: IntegrationServiceDependencies = {}
): Promise<IntegrationPerformanceResponse> {
  const deps = dependencies(input);
  const statusResponse = await getIntegrationsResponse(input);
  const metricRecords = await Promise.all(
    INTEGRATION_PROVIDERS.map(async (provider) => {
      try {
        const records = await listProviderMetricRecords(provider, deps.storage);
        if (provider !== "youtube") return records;
        const status = statusResponse.providers.find(
          (candidate) => candidate.provider === "youtube"
        );
        const freshAccountIds = new Set(
          status?.accounts
            .filter((account) => account.authorization.status === "healthy")
            .map((account) => account.account.id) ?? []
        );
        const retained: StoredProviderMetrics[] = [];
        for (const record of records) {
          const accountId = record.posts[0]?.accountId;
          if (!accountId) continue;
          if (
            !youtubeProviderDataIsFresh(record.syncedAt, deps.now) ||
            !status?.connected ||
            !freshAccountIds.has(accountId)
          ) {
            await deleteProviderMetrics(provider, accountId, deps.storage);
            continue;
          }
          retained.push(record);
        }
        return retained;
      } catch {
        return [];
      }
    })
  );
  const flatRecords = metricRecords.flat();
  const connectedAccountIds = new Map<
    IntegrationProvider,
    Set<string>
  >();
  for (const status of statusResponse.providers) {
    connectedAccountIds.set(
      status.provider,
      new Set(
        status.configuration === "ready"
          ? status.accounts
              .filter(
                (account) =>
                  account.authorization.status === "healthy" &&
                  (status.provider !== "youtube" ||
                    status.youtubeCompliance?.consentAccepted === true)
              )
              .map((account) => account.account.id)
          : []
      )
    );
  }
  const available = flatRecords.filter((record) => {
    const accountId = record.posts[0]?.accountId;
    if (!accountId) return false;
    return (
      connectedAccountIds.get(record.provider)?.has(accountId) ?? false
    );
  });
  const posts = available
    .flatMap((record) => record.posts)
    .sort((left, right) => {
      const leftTime = left.publishedAt
        ? new Date(left.publishedAt).getTime()
        : 0;
      const rightTime = right.publishedAt
        ? new Date(right.publishedAt).getTime()
        : 0;
      return rightTime - leftTime;
    });
  const lastUpdatedAt = available
    .map((record) => record.syncedAt)
    .sort()
    .at(-1) ?? null;

  return { ...statusResponse, posts, lastUpdatedAt };
}
