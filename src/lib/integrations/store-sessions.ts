import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  type EncryptedIntegrationSecret,
} from "./crypto";
import {
  prismaIntegrationStorage,
  type IntegrationStorage,
} from "./store";
import {
  decode,
  encode,
  publishSessionKey,
  stateKey,
  type StoredOAuthStateRecord,
} from "./store-codec";
import type { IntegrationProvider } from "./types";

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
