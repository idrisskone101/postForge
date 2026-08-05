import { getIntegrationEncryptionKey } from "./crypto";
import { isProviderConfigured } from "./config";
import {
  deleteProviderMetrics,
  findExpiredYouTubePublishSessions,
  listProviderConnections,
  prismaIntegrationStorage,
  readProviderMetrics,
} from "./store";
import {
  forceDeleteLocalIntegrationData,
  syncIntegrationAccount,
  type IntegrationServiceDependencies,
} from "./service";
import {
  scrubYouTubeAutomationProviderData,
  expireYouTubeUploadRecoverySessions,
  youtubeApiDataIsFresh,
  youtubeApiDataRefreshIsDue,
} from "./retention-records";
import {
  isAutomationRecord,
  type AutomationRecord,
} from "../automations";
import { updateWorkspaceFeatureRecords } from "../workspace-feature-store";
import type { DecryptedIntegrationConnection } from "./types";

async function applyExpiredUploadSessions(
  input: IntegrationServiceDependencies,
  now: Date,
  attemptIds: ReadonlySet<string>
) {
  if (attemptIds.size === 0) return 0;
  if (input.automationRecords) {
    const expired = expireYouTubeUploadRecoverySessions(
      input.automationRecords,
      { now, attemptIds }
    );
    input.automationRecords.splice(
      0,
      input.automationRecords.length,
      ...expired.records
    );
    return expired.changed;
  }
  const storage = input.storage ?? prismaIntegrationStorage;
  if (storage !== prismaIntegrationStorage) return 0;
  let changed = 0;
  await updateWorkspaceFeatureRecords<AutomationRecord>(
    "automations",
    (records) => {
      const expired = expireYouTubeUploadRecoverySessions(
        records.filter(isAutomationRecord),
        { now, attemptIds }
      );
      changed = expired.changed;
      return expired.records;
    }
  );
  return changed;
}

async function applyAutomationRetention(
  input: IntegrationServiceDependencies,
  options: Parameters<typeof scrubYouTubeAutomationProviderData>[1]
) {
  if (input.automationRecords) {
    const scrubbed = scrubYouTubeAutomationProviderData(
      input.automationRecords,
      options
    );
    input.automationRecords.splice(
      0,
      input.automationRecords.length,
      ...scrubbed.records
    );
    return scrubbed.changed;
  }
  const storage = input.storage ?? prismaIntegrationStorage;
  if (storage !== prismaIntegrationStorage) return 0;

  let changed = 0;
  await updateWorkspaceFeatureRecords<AutomationRecord>(
    "automations",
    (records) => {
      const scrubbed = scrubYouTubeAutomationProviderData(
        records.filter(isAutomationRecord),
        options
      );
      changed = scrubbed.changed;
      return scrubbed.records;
    }
  );
  return changed;
}

function connectionReferenceTimes(connection: DecryptedIntegrationConnection) {
  return {
    authorization:
      connection.authorization.lastCheckedAt ?? connection.connectedAt,
    account: connection.sync.lastSuccessfulAt ?? connection.connectedAt,
  };
}

export async function runYouTubeDataRetentionSweep(
  input: IntegrationServiceDependencies = {}
) {
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  const storage = input.storage ?? prismaIntegrationStorage;
  const expiredSessions = await findExpiredYouTubePublishSessions(
    now,
    storage
  );
  const uploadRecoveriesExpired = await applyExpiredUploadSessions(
    input,
    now,
    new Set(expiredSessions.map(({ attemptId }) => attemptId))
  );
  await Promise.all(expiredSessions.map(({ key }) => storage.delete(key)));
  const publishSessionsDeleted = expiredSessions.length;

  let encryptionKey: Buffer | null = null;
  try {
    encryptionKey = getIntegrationEncryptionKey(env);
  } catch {
    encryptionKey = null;
  }

  const connections = encryptionKey
    ? await listProviderConnections("youtube", encryptionKey, storage)
        .then((result) => result.connections)
        .catch(() => [])
    : [];

  let refreshAttempted = false;
  let refreshSucceeded = false;
  let connectionDeleted = false;
  let metricsDeleted = false;
  let automationsScrubbed = 0;

  for (const connection of connections) {
    const references = connectionReferenceTimes(connection);
    const refreshDue =
      connection.authorization.status !== "healthy" ||
      youtubeApiDataRefreshIsDue(references.authorization, now) ||
      youtubeApiDataRefreshIsDue(references.account, now);
    if (refreshDue && isProviderConfigured("youtube", env)) {
      refreshAttempted = true;
      try {
        await syncIntegrationAccount("youtube", connection.account.id, input);
        refreshSucceeded = true;
      } catch {
        // Sync persists authorization failures. The deletion decision below
        // uses the post-attempt record and the immutable provider-data clocks.
      }
    }
    const refreshed = encryptionKey
      ? await listProviderConnections("youtube", encryptionKey, storage)
          .then((result) =>
            result.connections.find(
              (candidate) => candidate.account.id === connection.account.id
            )
          )
          .catch(() => null)
      : null;
    const reference = refreshed
      ? connectionReferenceTimes(refreshed)
      : references;
    const authorizationExpired =
      !refreshed ||
      refreshed.authorization.status === "reauthorization_required" ||
      !youtubeApiDataIsFresh(reference.authorization, now);
    const accountDataExpired = !youtubeApiDataIsFresh(reference.account, now);
    const deleteConnection = authorizationExpired || accountDataExpired;

    const automationsScrubbedNow = await applyAutomationRetention(input, {
      now,
      scrubAccountBindings: deleteConnection,
      disconnectedAccountId: deleteConnection ? connection.account.id : null,
      activeAccount: deleteConnection
        ? null
        : {
            id: connection.account.id,
            username: connection.account.username,
            displayName: connection.account.displayName,
          },
    });
    automationsScrubbed += automationsScrubbedNow;

    if (deleteConnection) {
      await forceDeleteLocalIntegrationData(
        "youtube",
        connection.account.id,
        input
      );
      connectionDeleted = true;
      metricsDeleted = true;
      continue;
    }

    const metrics = await readProviderMetrics(
      "youtube",
      connection.account.id,
      storage
    ).catch(() => null);
    if (
      metrics &&
      !youtubeApiDataIsFresh(metrics.syncedAt, now)
    ) {
      await deleteProviderMetrics(
        "youtube",
        connection.account.id,
        storage
      );
      metricsDeleted = true;
    }
  }

  return {
    refreshAttempted,
    refreshSucceeded,
    connectionDeleted,
    metricsDeleted,
    publishSessionsDeleted,
    uploadRecoveriesExpired,
    automationsScrubbed,
  };
}
