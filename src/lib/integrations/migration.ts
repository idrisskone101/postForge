import { INTEGRATION_PROVIDERS, type IntegrationProvider } from "./types";
import { getIntegrationEncryptionKey } from "./crypto";
import { getIntegrationPublicUrl } from "./config";
import {
  migrateLegacyProviderConnections,
  prismaIntegrationStorage,
  type IntegrationStorage,
} from "./store";

function isIntegrationConfigured(provider: IntegrationProvider) {
  if (provider === "tiktok") {
    return Boolean(
      process.env.TIKTOK_CLIENT_KEY?.trim() &&
        process.env.TIKTOK_CLIENT_SECRET?.trim()
    );
  }
  if (provider === "instagram") {
    return Boolean(
      process.env.INSTAGRAM_CLIENT_ID?.trim() &&
        process.env.INSTAGRAM_CLIENT_SECRET?.trim()
    );
  }
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID?.trim() &&
      process.env.YOUTUBE_CLIENT_SECRET?.trim()
  );
}

/**
 * Move legacy single-connection-per-provider records into the per-account
 * layout: integrations/connections/{provider}/{accountId}.json and
 * integrations/metrics/{provider}/{accountId}.json. Idempotent; a record that
 * cannot be decrypted is retained under its legacy key so the status layer can
 * keep reporting it as unreadable instead of deleting credentials.
 */
export async function migrateLegacyIntegrationConnections(
  storage: IntegrationStorage = prismaIntegrationStorage,
  env: NodeJS.ProcessEnv = process.env
) {
  if (!getIntegrationPublicUrl(env)) return { migratedProviders: [] };
  let encryptionKey: Buffer;
  try {
    encryptionKey = getIntegrationEncryptionKey(env);
  } catch {
    return { migratedProviders: [] };
  }
  const migratedProviders: IntegrationProvider[] = [];
  for (const provider of INTEGRATION_PROVIDERS) {
    if (!isIntegrationConfigured(provider)) continue;
    try {
      const result = await migrateLegacyProviderConnections(
        provider,
        encryptionKey,
        storage
      );
      if (result.migrated) migratedProviders.push(provider);
    } catch {
      // Migration must never block server startup for one provider.
    }
  }
  return { migratedProviders };
}
