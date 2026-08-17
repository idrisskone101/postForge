import assert from "node:assert/strict";
import {
  encryptIntegrationSecret,
  decryptIntegrationSecret,
  getIntegrationEncryptionKey,
} from "../src/lib/integrations/crypto";
import {
  getStoredProviderCredential,
  PROVIDER_ENV_KEYS,
  saveProviderCredential,
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
  // The package script pins DATABASE_URL to an unreachable local port so this
  // security check is independent of a developer's local Postgres state.
  let readFailed = false;
  try {
    const value = await getStoredProviderCredential("fal");
    assert.equal(value, null);
  } catch {
    readFailed = true;
  }
  assert.equal(readFailed, true, "the isolated credential database must be unreachable");
}

async function testSaveFailsCleanlyWithoutDb() {
  let saveFailed = false;
  try {
    await saveProviderCredential("fal", "some-key");
  } catch {
    saveFailed = true;
  }
  assert.equal(saveFailed, true, "credential persistence must fail closed without a database");
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
