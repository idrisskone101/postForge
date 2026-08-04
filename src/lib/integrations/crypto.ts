import {
  createCipheriv,
  createDecipheriv,
  randomBytes as nodeRandomBytes,
} from "node:crypto";

export type EncryptedIntegrationSecret = {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
};

export class IntegrationEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationEncryptionError";
  }
}

export function decodeIntegrationEncryptionKey(value: string): Buffer {
  const normalized = value.trim();
  let key: Buffer;

  if (/^[a-fA-F0-9]{64}$/.test(normalized)) {
    key = Buffer.from(normalized, "hex");
  } else {
    key = Buffer.from(normalized.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  }

  if (key.length !== 32) {
    throw new IntegrationEncryptionError(
      "INTEGRATION_ENCRYPTION_KEY must decode to exactly 32 bytes"
    );
  }
  return key;
}

export function getIntegrationEncryptionKey(
  env: Record<string, string | undefined> = process.env
) {
  const value = env.INTEGRATION_ENCRYPTION_KEY;
  if (!value?.trim()) {
    throw new IntegrationEncryptionError(
      "Integration encryption is not configured"
    );
  }
  return decodeIntegrationEncryptionKey(value);
}

export function encryptIntegrationSecret(
  plaintext: string,
  key: Buffer,
  context: string,
  randomBytes: (size: number) => Buffer = nodeRandomBytes
): EncryptedIntegrationSecret {
  const iv = randomBytes(12);
  if (iv.length !== 12) {
    throw new IntegrationEncryptionError("AES-GCM requires a 12-byte IV");
  }
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
}

export function decryptIntegrationSecret(
  encrypted: EncryptedIntegrationSecret,
  key: Buffer,
  context: string
) {
  try {
    if (
      encrypted.version !== 1 ||
      encrypted.algorithm !== "aes-256-gcm"
    ) {
      throw new Error("Unsupported encrypted value");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(encrypted.iv, "base64url")
    );
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new IntegrationEncryptionError(
      "Stored integration credentials could not be decrypted"
    );
  }
}
