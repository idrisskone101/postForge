import { getIntegrationEncryptionKey } from "./crypto";
import { isProviderConfigured } from "./config";
import {
  deleteProviderMetrics,
  findExpiredYouTubePublishSessions,
  prismaIntegrationStorage,
  readIntegrationConnection,
  readProviderMetrics,
} from "./store";
import {
  forceDeleteLocalIntegrationData,
  syncIntegrationProvider,
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

async function readConnection(
  input: IntegrationServiceDependencies,
  storage: NonNullable<IntegrationServiceDependencies["storage"]>
) {
  try {
    const key = getIntegrationEncryptionKey(input.env ?? process.env);
    return {
      connection: await readIntegrationConnection("youtube", key, storage),
      unreadable: false,
    };
  } catch {
    return { connection: null, unreadable: true };
  }
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

  let { connection, unreadable } = await readConnection(input, storage);
  let refreshAttempted = false;
  let refreshSucceeded = false;

  if (connection) {
    const references = connectionReferenceTimes(connection);
    const refreshDue =
      connection.authorization.status !== "healthy" ||
      youtubeApiDataRefreshIsDue(references.authorization, now) ||
      youtubeApiDataRefreshIsDue(references.account, now);
    if (refreshDue && isProviderConfigured("youtube", env)) {
      refreshAttempted = true;
      try {
        await syncIntegrationProvider("youtube", input);
        refreshSucceeded = true;
      } catch {
        // Sync persists authorization failures. The deletion decision below
        // uses the post-attempt record and the immutable provider-data clocks.
      }
      ({ connection, unreadable } = await readConnection(input, storage));
    }
  }

  const references = connection ? connectionReferenceTimes(connection) : null;
  const authorizationExpired =
    !connection ||
    unreadable ||
    connection.authorization.status === "reauthorization_required" ||
    !youtubeApiDataIsFresh(references?.authorization ?? null, now);
  const accountDataExpired =
    !connection ||
    unreadable ||
    !youtubeApiDataIsFresh(references?.account ?? null, now);
  const deleteConnection = authorizationExpired || accountDataExpired;

  const automationsScrubbed = await applyAutomationRetention(input, {
    now,
    scrubAccountBindings: deleteConnection,
    activeAccount: deleteConnection
      ? null
      : {
          id: connection!.account.id,
          username: connection!.account.username,
          displayName: connection!.account.displayName,
        },
  });

  let connectionDeleted = false;
  if (deleteConnection) {
    await forceDeleteLocalIntegrationData("youtube", input);
    connectionDeleted = true;
  }

  const metrics = await readProviderMetrics("youtube", storage).catch(
    () => null
  );
  const authorizationHealthy =
    !connectionDeleted && connection?.authorization.status === "healthy";
  const metricsMustBeDeleted =
    Boolean(metrics) &&
    (!authorizationHealthy ||
      !youtubeApiDataIsFresh(metrics?.syncedAt ?? null, now));
  if (metricsMustBeDeleted) {
    await deleteProviderMetrics("youtube", storage);
  }

  return {
    refreshAttempted,
    refreshSucceeded,
    connectionDeleted,
    metricsDeleted: metricsMustBeDeleted || connectionDeleted,
    publishSessionsDeleted,
    uploadRecoveriesExpired,
    automationsScrubbed,
  };
}
