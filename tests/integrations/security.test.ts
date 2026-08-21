import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  decodeIntegrationEncryptionKey,
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "../../src/lib/integrations/crypto";
import {
  consumeOAuthStateRecord,
  createMemoryIntegrationStorage,
  pruneExpiredOAuthStateRecords,
  readIntegrationConnection,
  saveIntegrationConnection,
  saveOAuthStateRecord,
} from "../../src/lib/integrations/store";
import { isSameOriginMutation } from "../../src/lib/http";
import {
  createOAuthState,
  verifyOAuthState,
} from "../../src/lib/integrations/state";
import type { DecryptedIntegrationConnection } from "../../src/lib/integrations/types";
import { NextRequest } from "next/server";
import { middleware } from "../../src/middleware";
import {
  handleInstagramDeauthorize,
  verifyMetaSignedRequest,
} from "../../src/lib/integrations/meta-deauthorize";

function metaSignedRequest(
  payload: Record<string, unknown>,
  secret = "instagram-app-secret-value"
) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${signature}.${encodedPayload}`;
}

async function run() {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousApiKey = process.env.POSTFORGE_API_KEY;
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.POSTFORGE_API_KEY = "operator-api-key";
  for (const pathname of ["/privacy", "/terms", "/data-deletion"]) {
    const publicPolicyResponse = middleware(
      new NextRequest(`https://postforge.example${pathname}`)
    );
    assert.equal(
      publicPolicyResponse.headers.get("x-middleware-next"),
      "1",
      `${pathname} must remain public for provider review and deletion requests`
    );
  }
  const cronPassThrough = middleware(
    new NextRequest(
      "https://postforge.example/api/integrations/retention",
      { headers: { Authorization: "Bearer retention-secret-value" } }
    )
  );
  assert.equal(cronPassThrough.headers.get("x-middleware-next"), "1");
  const instagramDeauthorizePassThrough = middleware(
    new NextRequest(
      "https://postforge.example/api/integrations/instagram/deauthorize",
      { method: "POST" }
    )
  );
  assert.equal(
    instagramDeauthorizePassThrough.headers.get("x-middleware-next"),
    "1"
  );
  const ordinaryApiResponse = middleware(
    new NextRequest("https://postforge.example/api/integrations/youtube/sync", {
      headers: { Authorization: "Bearer retention-secret-value" },
    })
  );
  assert.equal(ordinaryApiResponse.status, 401);
  delete process.env.POSTFORGE_API_KEY;
  const localProductionResponse = middleware(
    new NextRequest("http://0.0.0.0:3100/")
  );
  assert.equal(localProductionResponse.headers.get("x-middleware-next"), "1");
  const unconfiguredPublicResponse = middleware(
    new NextRequest("https://postforge.example/")
  );
  assert.equal(unconfiguredPublicResponse.status, 503);
  if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
  if (previousApiKey === undefined) delete process.env.POSTFORGE_API_KEY;
  else process.env.POSTFORGE_API_KEY = previousApiKey;

  const signedRequest = metaSignedRequest({
    algorithm: "HMAC-SHA256",
    issued_at: 1786290000,
    user_id: "instagram-user-123",
  });
  assert.deepEqual(
    verifyMetaSignedRequest(signedRequest, "instagram-app-secret-value"),
    { userId: "instagram-user-123", issuedAt: 1786290000 }
  );
  assert.throws(
    () => verifyMetaSignedRequest(`${signedRequest}tampered`, "instagram-app-secret-value"),
    /signed request/
  );
  assert.throws(
    () =>
      verifyMetaSignedRequest(
        metaSignedRequest({ algorithm: "none", user_id: "instagram-user-123" }),
        "instagram-app-secret-value"
      ),
    /algorithm/
  );

  let deletedInstagramAccount: string | null = null;
  const deauthorizeForm = new FormData();
  deauthorizeForm.set("signed_request", signedRequest);
  const deauthorizeResponse = await handleInstagramDeauthorize(
    new Request("https://postforge.example/api/integrations/instagram/deauthorize", {
      method: "POST",
      body: deauthorizeForm,
    }),
    {
      appSecret: "instagram-app-secret-value",
      deleteAccount: async (accountId) => {
        deletedInstagramAccount = accountId;
      },
    }
  );
  assert.equal(deauthorizeResponse.status, 200);
  assert.equal(deauthorizeResponse.headers.get("cache-control"), "no-store");
  assert.equal(deletedInstagramAccount, "instagram-user-123");

  const invalidDeauthorizeForm = new FormData();
  invalidDeauthorizeForm.set("signed_request", `${signedRequest}tampered`);
  const invalidDeauthorizeResponse = await handleInstagramDeauthorize(
    new Request("https://postforge.example/api/integrations/instagram/deauthorize", {
      method: "POST",
      body: invalidDeauthorizeForm,
    }),
    {
      appSecret: "instagram-app-secret-value",
      deleteAccount: async () => {
        assert.fail("Invalid signed requests must not delete provider data");
      },
    }
  );
  assert.equal(invalidDeauthorizeResponse.status, 400);

  assert.equal(
    isSameOriginMutation(
      new Request("https://postforge.example/api/integrations/tiktok/sync", {
        method: "POST",
        headers: {
          Origin: "https://postforge.example",
          "Sec-Fetch-Site": "same-origin",
        },
      })
    ),
    true
  );
  assert.equal(
    isSameOriginMutation(
      new Request("https://postforge.example/api/integrations/tiktok/sync", {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Sec-Fetch-Site": "cross-site",
        },
      })
    ),
    false
  );
  assert.equal(
    isSameOriginMutation(
      new Request("https://postforge.example/api/integrations/tiktok/sync", {
        method: "POST",
      })
    ),
    false,
    "Missing browser origin metadata must fail closed"
  );
  assert.equal(
    isSameOriginMutation(
      new Request("http://postforge.example/api/workspace-features/collections", {
        method: "PUT",
        headers: {
          Origin: "https://postforge.example",
          "Sec-Fetch-Site": "same-origin",
          "X-Forwarded-Host": "postforge.example",
          "X-Forwarded-Proto": "https",
        },
      })
    ),
    true,
    "TLS-terminating proxies must not break same-origin detection"
  );
  assert.equal(
    isSameOriginMutation(
      new Request("https://postforge.example/api/integrations/tiktok/sync", {
        method: "POST",
        headers: {
          Origin: "https://attacker.example",
          "Sec-Fetch-Site": "same-origin",
        },
      })
    ),
    false,
    "Mismatched origin host must be rejected"
  );
  const key = Buffer.alloc(32, 7);
  assert.deepEqual(
    decodeIntegrationEncryptionKey(key.toString("base64")),
    key
  );
  assert.deepEqual(decodeIntegrationEncryptionKey(key.toString("hex")), key);
  assert.throws(() => decodeIntegrationEncryptionKey("too-short"), /32 bytes/);

  const encrypted = encryptIntegrationSecret(
    "access-token-secret",
    key,
    "test:access",
    () => Buffer.alloc(12, 3)
  );
  assert.equal(encrypted.algorithm, "aes-256-gcm");
  assert.doesNotMatch(JSON.stringify(encrypted), /access-token-secret/);
  assert.equal(
    decryptIntegrationSecret(encrypted, key, "test:access"),
    "access-token-secret"
  );
  assert.throws(
    () => decryptIntegrationSecret(encrypted, key, "test:refresh"),
    /could not be decrypted/
  );

  const now = new Date("2026-08-03T12:00:00.000Z");
  const created = createOAuthState("tiktok", key, {
    now,
    randomBytes: () => Buffer.alloc(24, 9),
  });
  const verified = verifyOAuthState({
    provider: "tiktok",
    state: created.state,
    cookieValue: created.cookieValue,
    signingKey: key,
    now: new Date("2026-08-03T12:05:00.000Z"),
  });
  assert.equal(verified.nonceHash, created.nonceHash);
  assert.throws(
    () =>
      verifyOAuthState({
        provider: "instagram",
        state: created.state,
        cookieValue: created.cookieValue,
        signingKey: key,
        now,
      }),
    /invalid or expired/
  );
  assert.throws(
    () =>
      verifyOAuthState({
        provider: "tiktok",
        state: created.state,
        cookieValue: `${created.cookieValue}tampered`,
        signingKey: key,
        now,
      }),
    /invalid or expired/
  );
  assert.throws(
    () =>
      verifyOAuthState({
        provider: "tiktok",
        state: created.state,
        cookieValue: created.cookieValue,
        signingKey: key,
        now: new Date("2026-08-03T12:11:00.000Z"),
      }),
    /invalid or expired/
  );

  const storage = createMemoryIntegrationStorage();
  const expired = createOAuthState("instagram", key, {
    now: new Date("2026-08-03T11:00:00.000Z"),
    randomBytes: () => Buffer.alloc(24, 5),
  });
  await saveOAuthStateRecord(expired.nonceHash, expired.record, storage);
  assert.equal(
    await pruneExpiredOAuthStateRecords(
      new Date("2026-08-03T11:11:00.000Z"),
      storage
    ),
    1
  );
  await saveOAuthStateRecord(created.nonceHash, created.record, storage);
  assert.equal(
    (
      await consumeOAuthStateRecord(
        created.nonceHash,
        "tiktok",
        now,
        storage
      )
    )?.provider,
    "tiktok"
  );
  assert.equal(
    await consumeOAuthStateRecord(created.nonceHash, "tiktok", now, storage),
    null,
    "OAuth state must be single-use"
  );

  const concurrent = createOAuthState("youtube", key, {
    now,
    randomBytes: () => Buffer.alloc(24, 8),
  });
  await saveOAuthStateRecord(concurrent.nonceHash, concurrent.record, storage);
  const concurrentClaims = await Promise.all([
    consumeOAuthStateRecord(concurrent.nonceHash, "youtube", now, storage),
    consumeOAuthStateRecord(concurrent.nonceHash, "youtube", now, storage),
  ]);
  assert.equal(
    concurrentClaims.filter(Boolean).length,
    1,
    "Only one concurrent callback may claim an OAuth state"
  );
  assert.equal(concurrentClaims.find(Boolean)?.provider, "youtube");

  const connection: DecryptedIntegrationConnection = {
    version: 1,
    provider: "tiktok",
    account: {
      id: "open-id-1",
      username: null,
      displayName: "Creator",
      avatarUrl: null,
      profileUrl: null,
    },
    grantedScopes: ["user.info.basic", "video.list"],
    tokens: {
      accessToken: "stored-access-secret",
      refreshToken: "stored-refresh-secret",
      expiresAt: "2026-08-03T14:00:00.000Z",
      refreshTokenExpiresAt: "2026-09-03T14:00:00.000Z",
      grantedScopes: ["user.info.basic", "video.list"],
      tokenType: "Bearer",
    },
    connectedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    authorization: {
      status: "healthy",
      lastCheckedAt: now.toISOString(),
    },
    sync: {
      status: "never",
      lastAttemptAt: null,
      lastSuccessfulAt: null,
      warnings: [],
    },
  };
  await saveIntegrationConnection(connection, key, storage);
  const rawStored = [...storage.entries.values()].map((value) =>
    Buffer.from(value).toString("utf8")
  );
  assert.doesNotMatch(rawStored.join("\n"), /stored-access-secret/);
  assert.doesNotMatch(rawStored.join("\n"), /stored-refresh-secret/);
  assert.deepEqual(
    await readIntegrationConnection("tiktok", "open-id-1", key, storage),
    connection
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
