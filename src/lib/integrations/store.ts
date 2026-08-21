import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { decode, encode } from "./store-codec";
import type { IntegrationProvider } from "./types";

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

export type { StoredOAuthStateRecord, StoredProviderMetrics } from "./store-codec";
export { validProviderAccountId } from "./store-codec";
export {
  deleteIntegrationConnection,
  deleteProviderMetrics,
  listProviderConnections,
  listProviderMetricRecords,
  migrateLegacyProviderConnections,
  readIntegrationConnection,
  readProviderMetrics,
  saveIntegrationConnection,
  saveProviderMetrics,
} from "./store-connections";
export {
  consumeOAuthStateRecord,
  deleteAllYouTubePublishSessions,
  deleteYouTubePublishSession,
  findExpiredYouTubePublishSessions,
  pruneExpiredOAuthStateRecords,
  readYouTubePublishSession,
  saveOAuthStateRecord,
  saveYouTubePublishSession,
} from "./store-sessions";
