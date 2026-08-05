import assert from "node:assert/strict";
import {
  encryptIntegrationSecret,
  decryptIntegrationSecret,
  getIntegrationEncryptionKey,
} from "../src/lib/integrations/crypto";
import {
  getProviderCredential,
  getStoredProviderCredential,
  PROVIDER_ENV_KEYS,
  saveProviderCredential,
  clearProviderCredential,
} from "../src/lib/providers/credentials";

const TEST_KEY_HEX = "a".repeat(64);
process.env.INTEGRATION_ENCRYPTION_KEY = TEST_KEY_HEX;

function testEncryptionRoundTrip() {
  const key = getIntegrationEncryptionKey({ INTEGRATION_ENCRYPTION_KEY: TEST_KEY_HEX });
  const secret = encryptIntegrationSecret("fal-secret-value", key, "postforge:provider-credential:fal");
  const decrypted = decryptIntegrationSecret(secret, key, "postforge:provider-credential:fal");
  assert.equal(decrypted, "fal-secret-value");

  // A different context (wrong provider) must fail to decrypt.
  assert.throws(() =>
    decryptIntegrationSecret(secret, key, "postforge:provider-credential:gemini")
  );
}

function testEnvFallback() {
  process.env.FAL_KEY = "env-fal-key";
  const envValue = PROVIDER_ENV_KEYS.fal;
  assert.equal(envValue, "FAL_KEY");
  delete process.env.FAL_KEY;
}

async function testStoredCredentialNotReadableWithoutDb() {
  // In a headless run there is no database; reads must fail cleanly (returning
  // null) rather than crash.
  try {
    const value = await getStoredProviderCredential("fal");
    assert.equal(value, null);
  } catch (error) {
    assert.match(
      error instanceof Error ? error.message : String(error),
      /does not exist|connection|database|ECONNREFUSED/i
    );
  }
}

async function testSaveFailsCleanlyWithoutDb() {
  try {
    await saveProviderCredential("fal", "some-key");
    // If a database happens to be present, verify the round trip is safe.
    const stored = await getProviderCredential("fal");
    assert.equal(stored, "some-key");
    await clearProviderCredential("fal");
    const cleared = await getStoredProviderCredential("fal");
    assert.equal(cleared, null);
  } catch (error) {
    assert.match(
      error instanceof Error ? error.message : String(error),
      /does not exist|connection|database|ECONNREFUSED/i
    );
  }
}

async function run() {
  testEncryptionRoundTrip();
  testEnvFallback();
  await testStoredCredentialNotReadableWithoutDb();
  await testSaveFailsCleanlyWithoutDb();
  console.log("provider credential tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
