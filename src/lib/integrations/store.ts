import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  type EncryptedIntegrationSecret,
} from "./crypto";
import type {
  DecryptedIntegrationConnection,
  IntegrationProvider,
  PublicOwnedPostMetric,
  YouTubePolicyAcceptance,
} from "./types";

export type IntegrationStorage = {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, data: Uint8Array): Promise<void>;
  delete(key: string): Promise<boolean>;
  list?(prefix: string): Promise<Array<{ key: string; data: Uint8Array }>>;
  runExclusive<T>(
    lockKey: string,
    operation: (lockedStorage: IntegrationStorage) => Promise<T>
  ): Promise<T>;
};

type StoredAssetClient = Pick<Prisma.TransactionClient, "storedAsset">;

function createPrismaStorage(client: StoredAssetClient): IntegrationStorage {
  const storage: IntegrationStorage = {
    async get(key) {
      const stored = await client.storedAsset.findUnique({
        where: { key },
        select: { data: true },
      });
      return stored?.data ?? null;
    },
    async set(key, data) {
      const bytes = Uint8Array.from(data);
      await client.storedAsset.upsert({
        where: { key },
        update: { data: bytes },
        create: { key, data: bytes },
      });
    },
    async delete(key) {
      const result = await client.storedAsset.deleteMany({ where: { key } });
      return result.count > 0;
    },
    async list(prefix) {
      const records = await client.storedAsset.findMany({
        where: { key: { startsWith: prefix } },
        select: { key: true, data: true },
      });
      return records.map((record) => ({
        key: record.key,
        data: Uint8Array.from(record.data),
      }));
    },
    async runExclusive(_lockKey, operation) {
      // The transaction-bound storage is already protected by its caller's
      // advisory lock. Keeping callbacks on this object prevents accidental
      // reads or writes through the global Prisma client.
      return operation(storage);
    },
  };
  return storage;
}

const globalPrismaStorage = createPrismaStorage(prisma);

export const prismaIntegrationStorage: IntegrationStorage = {
  ...globalPrismaStorage,
  async runExclusive(lockKey, operation) {
    return prisma.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`
          SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
        `;
        return operation(createPrismaStorage(transaction));
      },
      { maxWait: 5_000, timeout: 10_000 }
    );
  },
};

type MemoryIntegrationBackend = {
  entries: Map<string, Uint8Array>;
  queues: Map<string, Promise<void>>;
};

export type MemoryIntegrationStorage = IntegrationStorage & {
  entries: Map<string, Uint8Array>;
  createContext(): MemoryIntegrationStorage;
};

function createMemoryStorageForBackend(
  backend: MemoryIntegrationBackend
): MemoryIntegrationStorage {
  const storage: MemoryIntegrationStorage = {
    entries: backend.entries,
    createContext() {
      return createMemoryStorageForBackend(backend);
    },
    async get(key) {
      return backend.entries.get(key) ?? null;
    },
    async set(key, data) {
      backend.entries.set(key, Uint8Array.from(data));
    },
    async delete(key) {
      return backend.entries.delete(key);
    },
    async list(prefix) {
      return [...backend.entries.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, data]) => ({ key, data }));
    },
    async runExclusive(lockKey, operation) {
      const predecessor = backend.queues.get(lockKey) ?? Promise.resolve();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const tail = predecessor.catch(() => undefined).then(() => gate);
      backend.queues.set(lockKey, tail);

      await predecessor.catch(() => undefined);
      try {
        return await operation(storage);
      } finally {
        release();
        if (backend.queues.get(lockKey) === tail) {
          backend.queues.delete(lockKey);
        }
      }
    },
  };
  return storage;
}

export function createMemoryIntegrationStorage(
  initial: Record<string, Uint8Array> = {}
): MemoryIntegrationStorage {
  return createMemoryStorageForBackend({
    entries: new Map(Object.entries(initial)),
    queues: new Map(),
  });
}

type StoredConnection = Omit<DecryptedIntegrationConnection, "tokens"> & {
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

function connectionKey(provider: IntegrationProvider, accountId: string) {
  return `integrations/connections/${provider}/${accountId}.json`;
}

function metricsKey(provider: IntegrationProvider, accountId: string) {
  return `integrations/metrics/${provider}/${accountId}.json`;
}

/** Legacy single-connection-per-provider key; removed by migrateLegacyProviderConnections. */
function legacyConnectionKey(provider: IntegrationProvider) {
  return `integrations/connections/${provider}.json`;
}

/** Legacy single-metrics-per-provider key; removed by migrateLegacyProviderConnections. */
function legacyMetricsKey(provider: IntegrationProvider) {
  return `integrations/metrics/${provider}.json`;
}

function stateKey(nonceHash: string) {
  return `integrations/oauth-state/${nonceHash}.json`;
}

export type StoredOAuthStateRecord = {
  version: 1;
  provider: IntegrationProvider;
  expiresAt: string;
  youtubePolicyAcceptance?: YouTubePolicyAcceptance;
};

function publishSessionKey(attemptId: string) {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(attemptId)) {
    throw new Error("Publish attempt id is invalid");
  }
  return `integrations/publish-sessions/youtube/${attemptId}.json`;
}

function encode(value: unknown) {
  return Uint8Array.from(Buffer.from(JSON.stringify(value), "utf8"));
}

function decode<T>(data: Uint8Array): T {
  return JSON.parse(Buffer.from(data).toString("utf8")) as T;
}

/*
 * Provider mutations use a persistent fencing revision. Network requests run
 * outside the database transaction, but every snapshot and commit happens in
 * a short advisory-lock transaction using the transaction-bound storage passed
 * to the callback. A later disconnect can therefore invalidate an older sync
 * or reconnect across server instances without holding a database connection
 * open while waiting on a provider.
 */
type StoredProviderMutation = {
  version: 1;
  provider: IntegrationProvider;
  revision: number;
};

function providerMutationKey(provider: IntegrationProvider) {
  return `integrations/mutations/${provider}.json`;
}

function readStoredProviderMutation(
  data: Uint8Array | null,
  provider: IntegrationProvider
) {
  if (!data) return 0;
  try {
    const record = decode<StoredProviderMutation>(data);
    return record.version === 1 &&
      record.provider === provider &&
      Number.isSafeInteger(record.revision) &&
      record.revision >= 0
      ? record.revision
      : 0;
  } catch {
    return 0;
  }
}

export async function beginProviderMutation<T>(
  provider: IntegrationProvider,
  snapshot: (lockedStorage: IntegrationStorage) => Promise<T>,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  const key = providerMutationKey(provider);
  return storage.runExclusive(key, async (lockedStorage) => {
    const revision =
      readStoredProviderMutation(await lockedStorage.get(key), provider) + 1;
    const record: StoredProviderMutation = {
      version: 1,
      provider,
      revision,
    };
    await lockedStorage.set(key, encode(record));
    return { revision, snapshot: await snapshot(lockedStorage) };
  });
}

export async function commitProviderMutation<T>(
  provider: IntegrationProvider,
  revision: number,
  operation: (lockedStorage: IntegrationStorage) => Promise<T>,
  storage: IntegrationStorage = prismaIntegrationStorage
): Promise<{ committed: true; value: T } | { committed: false }> {
  const key = providerMutationKey(provider);
  return storage.runExclusive(key, async (lockedStorage) => {
    const currentRevision = readStoredProviderMutation(
      await lockedStorage.get(key),
      provider
    );
    if (currentRevision !== revision) return { committed: false };
    return {
      committed: true,
      value: await operation(lockedStorage),
    };
  });
}

export function validProviderAccountId(accountId: string) {
  return accountId.length > 0 && accountId.length <= 256;
}

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

export async function saveYouTubePublishSession(
  attemptId: string,
  uploadUrl: string,
  encryptionKey: Buffer,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  const context = `postforge:integration:youtube:publish-session:${attemptId}`;
  await storage.set(
    publishSessionKey(attemptId),
    encode({
      version: 1,
      provider: "youtube",
      attemptId,
      createdAt: new Date().toISOString(),
      uploadUrl: encryptIntegrationSecret(uploadUrl, encryptionKey, context),
    })
  );
}

export async function readYouTubePublishSession(
  attemptId: string,
  encryptionKey: Buffer,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  const data = await storage.get(publishSessionKey(attemptId));
  if (!data) return null;
  const record = decode<{
    version: 1;
    provider: "youtube";
    attemptId: string;
    createdAt?: string;
    uploadUrl: EncryptedIntegrationSecret;
  }>(data);
  if (
    record.version !== 1 ||
    record.provider !== "youtube" ||
    record.attemptId !== attemptId
  ) {
    throw new Error("Stored YouTube publish session is invalid");
  }
  return decryptIntegrationSecret(
    record.uploadUrl,
    encryptionKey,
    `postforge:integration:youtube:publish-session:${attemptId}`
  );
}

export async function deleteYouTubePublishSession(
  attemptId: string,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  await storage.delete(publishSessionKey(attemptId));
}

export async function findExpiredYouTubePublishSessions(
  now = new Date(),
  storage: IntegrationStorage = prismaIntegrationStorage,
  maximumAgeMs = 7 * 24 * 60 * 60 * 1000
) {
  if (!storage.list) return [];
  const records = await storage.list("integrations/publish-sessions/youtube/");
  const cutoff = now.getTime() - maximumAgeMs;
  return records.flatMap(({ key, data }) => {
    const keyAttemptId = key.split("/").at(-1)?.replace(/\.json$/, "") ?? "";
    try {
      const record = decode<{
        version?: unknown;
        provider?: unknown;
        attemptId?: unknown;
        createdAt?: unknown;
      }>(data);
      const createdAt =
        typeof record.createdAt === "string"
          ? new Date(record.createdAt).getTime()
          : Number.NaN;
      const expired =
        record.version !== 1 ||
        record.provider !== "youtube" ||
        !Number.isFinite(createdAt) ||
        createdAt <= cutoff;
      if (!expired) return [];
      const decodedAttemptId =
        typeof record.attemptId === "string" &&
        /^[A-Za-z0-9_-]{1,160}$/.test(record.attemptId)
          ? record.attemptId
          : null;
      const attemptId =
        decodedAttemptId === keyAttemptId ? decodedAttemptId : keyAttemptId;
      return /^[A-Za-z0-9_-]{1,160}$/.test(attemptId)
        ? [{ key, attemptId }]
        : [];
    } catch {
      return /^[A-Za-z0-9_-]{1,160}$/.test(keyAttemptId)
        ? [{ key, attemptId: keyAttemptId }]
        : [];
    }
  });
}

export async function deleteAllYouTubePublishSessions(
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  if (!storage.list) return 0;
  const records = await storage.list("integrations/publish-sessions/youtube/");
  await Promise.all(records.map(({ key }) => storage.delete(key)));
  return records.length;
}

export async function saveOAuthStateRecord(
  nonceHash: string,
  record: StoredOAuthStateRecord,
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  await storage.set(stateKey(nonceHash), encode(record));
}

export async function pruneExpiredOAuthStateRecords(
  now = new Date(),
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  if (!storage.list) return 0;
  const records = await storage.list("integrations/oauth-state/");
  const expiredKeys = records.flatMap(({ key, data }) => {
    try {
      const record = decode<{ expiresAt?: unknown }>(data);
      return typeof record.expiresAt !== "string" ||
        !Number.isFinite(new Date(record.expiresAt).getTime()) ||
        new Date(record.expiresAt).getTime() < now.getTime()
        ? [key]
        : [];
    } catch {
      return [key];
    }
  });
  await Promise.all(expiredKeys.map((key) => storage.delete(key)));
  return expiredKeys.length;
}

export async function consumeOAuthStateRecord(
  nonceHash: string,
  provider: IntegrationProvider,
  now = new Date(),
  storage: IntegrationStorage = prismaIntegrationStorage
) {
  const key = stateKey(nonceHash);
  const data = await storage.get(key);
  const claimed = await storage.delete(key);
  if (!data || !claimed) return null;
  try {
    const record = decode<StoredOAuthStateRecord>(data);
    return record.version === 1 &&
      record.provider === provider &&
      new Date(record.expiresAt).getTime() >= now.getTime()
        ? record
        : null;
  } catch {
    return null;
  }
}
