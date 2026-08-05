import { prisma } from "@/lib/db";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  getIntegrationEncryptionKey,
  type EncryptedIntegrationSecret,
} from "@/lib/integrations/crypto";

export const PROVIDER_CREDENTIAL_STORE_KEY =
  "workspace-features/provider-credentials.json";

export const PROVIDER_CREDENTIALS = ["fal", "gemini", "virlo"] as const;
export type ProviderCredentialId = (typeof PROVIDER_CREDENTIALS)[number];

export const PROVIDER_ENV_KEYS: Record<ProviderCredentialId, string> = {
  fal: "FAL_KEY",
  gemini: "GEMINI_API_KEY",
  virlo: "VIRLO_API_KEY",
};

type ProviderCredentialsRecord = {
  provider: ProviderCredentialId;
  secret: EncryptedIntegrationSecret;
  updatedAt: string;
};

function secretContext(provider: ProviderCredentialId) {
  return `postforge:provider-credential:${provider}`;
}

function decodeRecords(data: Uint8Array | null | undefined): ProviderCredentialsRecord[] {
  if (!data) return [];
  try {
    const parsed = JSON.parse(Buffer.from(data).toString("utf8"));
    return Array.isArray(parsed)
      ? parsed.filter(
          (record): record is ProviderCredentialsRecord =>
            typeof record === "object" &&
            record !== null &&
            typeof record.provider === "string" &&
            typeof record.secret === "object" &&
            record.secret !== null &&
            typeof record.secret.version === "number" &&
            typeof record.secret.algorithm === "string" &&
            typeof record.secret.iv === "string" &&
            typeof record.secret.authTag === "string" &&
            typeof record.secret.ciphertext === "string" &&
            typeof record.updatedAt === "string"
        )
      : [];
  } catch {
    return [];
  }
}

async function readStoredRecords(): Promise<ProviderCredentialsRecord[]> {
  const stored = await prisma.storedAsset.findUnique({
    where: { key: PROVIDER_CREDENTIAL_STORE_KEY },
    select: { data: true },
  });
  return decodeRecords(stored?.data);
}

export async function getStoredProviderCredential(
  provider: ProviderCredentialId
): Promise<string | null> {
  const records = await readStoredRecords();
  const record = records.find((candidate) => candidate.provider === provider);
  if (!record) return null;

  try {
    const key = getIntegrationEncryptionKey();
    return decryptIntegrationSecret(record.secret, key, secretContext(provider));
  } catch {
    return null;
  }
}

export async function getProviderCredential(
  provider: ProviderCredentialId
): Promise<string | null> {
  const stored = await getStoredProviderCredential(provider);
  if (stored) return stored;

  const envValue = process.env[PROVIDER_ENV_KEYS[provider]]?.trim();
  return envValue || null;
}

export async function saveProviderCredential(
  provider: ProviderCredentialId,
  plaintext: string
): Promise<void> {
  const value = plaintext.trim();
  if (!value) {
    throw new Error("A provider credential must not be empty");
  }

  const key = getIntegrationEncryptionKey();
  const secret = encryptIntegrationSecret(value, key, secretContext(provider));

  const records = await readStoredRecords();
  const next = records.filter((candidate) => candidate.provider !== provider);
  next.push({
    provider,
    secret,
    updatedAt: new Date().toISOString(),
  });

  await prisma.storedAsset.upsert({
    where: { key: PROVIDER_CREDENTIAL_STORE_KEY },
    update: {
      data: Uint8Array.from(Buffer.from(JSON.stringify(next, null, 2), "utf8")),
    },
    create: {
      key: PROVIDER_CREDENTIAL_STORE_KEY,
      data: Uint8Array.from(Buffer.from(JSON.stringify(next, null, 2), "utf8")),
    },
  });
}

export async function clearProviderCredential(
  provider: ProviderCredentialId
): Promise<void> {
  const records = await readStoredRecords();
  const next = records.filter((candidate) => candidate.provider !== provider);

  await prisma.storedAsset.upsert({
    where: { key: PROVIDER_CREDENTIAL_STORE_KEY },
    update: {
      data: Uint8Array.from(Buffer.from(JSON.stringify(next, null, 2), "utf8")),
    },
    create: {
      key: PROVIDER_CREDENTIAL_STORE_KEY,
      data: Uint8Array.from(Buffer.from(JSON.stringify(next, null, 2), "utf8")),
    },
  });
}
