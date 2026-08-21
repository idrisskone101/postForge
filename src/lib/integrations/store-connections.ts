import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "./crypto";
import {
  prismaIntegrationStorage,
  type IntegrationStorage,
} from "./store";
import {
  connectionKey,
  decode,
  encode,
  legacyConnectionKey,
  legacyMetricsKey,
  metricsKey,
  type StoredConnection,
  type StoredProviderMetrics,
  validProviderAccountId,
} from "./store-codec";
import type {
  DecryptedIntegrationConnection,
  IntegrationProvider,
} from "./types";

export async function readIntegrationConnection(
  provider: IntegrationProvider,
  accountId: string,
  encryptionKey: Buffer,
  storage: IntegrationStorage = prismaIntegrationStorage
): Promise<DecryptedIntegrationConnection | null> {
  if (!validProviderAccountId(accountId)) return null;
  const data = await storage.get(connectionKey(provider, accountId));
  if (!data) return null;
  const stored = decode<StoredConnection>(data);
  if (stored.version !== 1 || stored.provider !== provider) {
    throw new Error("Stored integration connection is invalid");
  }
  const context = `postforge:integration:${provider}:${accountId}`;
  return {
    ...stored,
    tokens: {
      ...stored.tokens,
      accessToken: decryptIntegrationSecret(
        stored.tokens.accessToken,
        encryptionKey,
        `${context}:access-token`
      ),
      refreshToken: stored.tokens.refreshToken
        ? decryptIntegrationSecret(
            stored.tokens.refreshToken,
            encryptionKey,
            `${context}:refresh-token`
          )
        : null,
    },
  };
}

export async function saveIntegrationConnection(
  connection: DecryptedIntegrationConnection,
  encryptionKey: Buffer,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  const accountId = connection.account.id;
  if (!validProviderAccountId(accountId)) {
    throw new Error("Provider account id is invalid");
  }
  const context = `postforge:integration:${connection.provider}:${accountId}`;
  const stored: StoredConnection = {
    ...connection,
    tokens: {
      ...connection.tokens,
      accessToken: encryptIntegrationSecret(
        connection.tokens.accessToken,
        encryptionKey,
        `${context}:access-token`
      ),
      refreshToken: connection.tokens.refreshToken
        ? encryptIntegrationSecret(
            connection.tokens.refreshToken,
            encryptionKey,
            `${context}:refresh-token`
          )
        : null,
    },
  };
  await storage.set(
    connectionKey(connection.provider, accountId),
    encode(stored)
  );
}

export async function deleteIntegrationConnection(
  provider: IntegrationProvider,
  accountId: string,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  if (!validProviderAccountId(accountId)) return;
  await Promise.all([
    storage.delete(connectionKey(provider, accountId)),
    storage.delete(metricsKey(provider, accountId)),
  ]);
}

export async function readProviderMetrics(
  provider: IntegrationProvider,
  accountId: string,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  if (!validProviderAccountId(accountId)) return null;
  const data = await storage.get(metricsKey(provider, accountId));
  if (!data) return null;
  const record = decode<StoredProviderMetrics>(data);
  return record.version === 1 && record.provider === provider ? record : null;
}

export async function saveProviderMetrics(
  record: StoredProviderMetrics,
  accountId: string,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  if (!validProviderAccountId(accountId)) return;
  await storage.set(metricsKey(record.provider, accountId), encode(record));
}

export async function deleteProviderMetrics(
  provider: IntegrationProvider,
  accountId: string,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  if (!validProviderAccountId(accountId)) return;
  await storage.delete(metricsKey(provider, accountId));
}

export async function listProviderConnections(
  provider: IntegrationProvider,
  encryptionKey: Buffer,
  storage: IntegrationStorage = prismaIntegrationStorage
): Promise<{
  connections: DecryptedIntegrationConnection[];
  unreadableAccountIds: string[];
}> {
  if (!storage.list) return { connections: [], unreadableAccountIds: [] };
  const prefix = `integrations/connections/${provider}/`;
  const records = await storage.list(prefix);
  const connections: DecryptedIntegrationConnection[] = [];
  const unreadableAccountIds: string[] = [];
  for (const { key, data } of records) {
    const accountId =
      key.slice(prefix.length).replace(/\.json$/, "").split("/").at(-1) ?? "";
    if (!validProviderAccountId(accountId)) continue;
    try {
      const stored = decode<StoredConnection>(data);
      if (stored.version !== 1 || stored.provider !== provider) {
        unreadableAccountIds.push(accountId);
        continue;
      }
      const context = `postforge:integration:${provider}:${accountId}`;
      const connection: DecryptedIntegrationConnection = {
        ...stored,
        tokens: {
          ...stored.tokens,
          accessToken: decryptIntegrationSecret(
            stored.tokens.accessToken,
            encryptionKey,
            `${context}:access-token`
          ),
          refreshToken: stored.tokens.refreshToken
            ? decryptIntegrationSecret(
                stored.tokens.refreshToken,
                encryptionKey,
                `${context}:refresh-token`
              )
            : null,
        },
      };
      connections.push(connection);
    } catch {
      unreadableAccountIds.push(accountId);
    }
  }
  return { connections, unreadableAccountIds };
}

export async function listProviderMetricRecords(
  provider: IntegrationProvider,
  storage: IntegrationStorage = prismaIntegrationStorage
): Promise<StoredProviderMetrics[]> {
  if (!storage.list) return [];
  const prefix = `integrations/metrics/${provider}/`;
  const records = await storage.list(prefix);
  const metrics: StoredProviderMetrics[] = [];
  for (const { key, data } of records) {
    const accountId =
      key.slice(prefix.length).replace(/\.json$/, "").split("/").at(-1) ?? "";
    if (!validProviderAccountId(accountId)) continue;
    try {
      const record = decode<StoredProviderMetrics>(data);
      if (
        record.version === 1 &&
        record.provider === provider &&
        record.posts.every((post) => post.accountId === accountId)
      ) {
        metrics.push(record);
      }
    } catch {
      // Skip unreadable metric records; status surfaces remain authoritative.
    }
  }
  return metrics;
}

export async function migrateLegacyProviderConnections(
  provider: IntegrationProvider,
  encryptionKey: Buffer,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  const legacyConnection = await storage.get(legacyConnectionKey(provider));
  if (!legacyConnection) return { migrated: false };
  let connection: DecryptedIntegrationConnection;
  try {
    connection = await readLegacyConnection(
      provider,
      legacyConnection,
      encryptionKey
    );
  } catch {
    // An unreadable legacy record is intentionally retained so the status
    // layer can still report reauthorization_required for it instead of
    // silently deleting credentials.
    return { migrated: false };
  }
  const accountId = connection.account.id;
  if (!validProviderAccountId(accountId)) return { migrated: false };
  const current = await storage.get(connectionKey(provider, accountId));
  if (!current) {
    await storage.set(connectionKey(provider, accountId), legacyConnection);
  }
  const legacyMetrics = await storage.get(legacyMetricsKey(provider));
  if (legacyMetrics) {
    const currentMetrics = await storage.get(metricsKey(provider, accountId));
    if (!currentMetrics) {
      await storage.set(metricsKey(provider, accountId), legacyMetrics);
    }
  }
  await Promise.all([
    storage.delete(legacyConnectionKey(provider)),
    storage.delete(legacyMetricsKey(provider)),
  ]);
  return { migrated: true };
}

async function readLegacyConnection(
  provider: IntegrationProvider,
  data: Uint8Array,
  encryptionKey: Buffer
): Promise<DecryptedIntegrationConnection> {
  const stored = decode<StoredConnection>(data);
  if (stored.version !== 1 || stored.provider !== provider) {
    throw new Error("Stored integration connection is invalid");
  }
  const context = `postforge:integration:${provider}`;
  return {
    ...stored,
    tokens: {
      ...stored.tokens,
      accessToken: decryptIntegrationSecret(
        stored.tokens.accessToken,
        encryptionKey,
        `${context}:access-token`
      ),
      refreshToken: stored.tokens.refreshToken
        ? decryptIntegrationSecret(
            stored.tokens.refreshToken,
            encryptionKey,
            `${context}:refresh-token`
          )
        : null,
    },
  };
}
