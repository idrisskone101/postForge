import assert from "node:assert/strict";
import {
  beginOAuthConnection,
  completeOAuthConnection,
  consumeProviderOAuthState,
  disconnectIntegrationProvider,
  forceDeleteLocalIntegrationData,
  getIntegrationPerformanceResponse,
  getIntegrationsResponse,
  getPublicIntegrationStatus,
  IntegrationDisconnectError,
  IntegrationMutationSupersededError,
  IntegrationSyncError,
  syncIntegrationProvider,
  YouTubePolicyConsentRequiredError,
  youtubeProviderDataIsFresh,
} from "../src/lib/integrations/service";
import { integrationJsonError } from "../src/lib/integrations/routes";
import {
  createMemoryIntegrationStorage,
  readIntegrationConnection,
  readProviderMetrics,
  saveIntegrationConnection,
  saveProviderMetrics,
} from "../src/lib/integrations/store";
import type {
  DecryptedIntegrationConnection,
  PublicOwnedPostMetric,
} from "../src/lib/integrations/types";

const key = Buffer.alloc(32, 6);
const env = {
  POSTFORGE_PUBLIC_URL: "https://postforge.example",
  INTEGRATION_ENCRYPTION_KEY: key.toString("base64"),
  TIKTOK_CLIENT_KEY: "tt-key",
  TIKTOK_CLIENT_SECRET: "tt-secret",
};
const youtubeEnv = {
  ...env,
  YOUTUBE_CLIENT_ID: "yt-id",
  YOUTUBE_CLIENT_SECRET: "yt-secret",
  POSTFORGE_PRIVACY_POLICY_URL: "https://postforge.example/privacy",
  POSTFORGE_TERMS_URL: "https://postforge.example/terms",
  POSTFORGE_DATA_DELETION_URL: "https://postforge.example/data-deletion",
  CRON_SECRET: "retention-secret-value",
};
const instagramEnv = {
  ...env,
  INSTAGRAM_CLIENT_ID: "ig-id",
  INSTAGRAM_CLIENT_SECRET: "ig-secret",
  FFPROBE_PATH: "/definitely/missing/postforge-ffprobe",
};

function connection(
  overrides: Partial<DecryptedIntegrationConnection> = {}
): DecryptedIntegrationConnection {
  return {
    version: 1,
    provider: "tiktok",
    account: {
      id: "account-current",
      username: null,
      displayName: "Current creator",
      avatarUrl: null,
      profileUrl: null,
    },
    grantedScopes: ["user.info.basic", "video.list"],
    tokens: {
      accessToken: "expired-access",
      refreshToken: "old-refresh",
      expiresAt: "2026-08-03T11:00:00.000Z",
      refreshTokenExpiresAt: "2026-09-03T11:00:00.000Z",
      grantedScopes: ["user.info.basic", "video.list"],
      tokenType: "Bearer",
    },
    connectedAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-01T12:00:00.000Z",
    authorization: {
      status: "healthy",
      lastCheckedAt: "2026-08-01T12:00:00.000Z",
    },
    sync: {
      status: "never",
      lastAttemptAt: null,
      lastSuccessfulAt: null,
      warnings: [],
    },
    ...overrides,
  };
}

function post(
  accountId: string,
  provider: "tiktok" | "instagram" | "youtube" = "tiktok"
): PublicOwnedPostMetric {
  return {
    id: `${provider}:post-1`,
    provider,
    externalId: "post-1",
    accountId,
    accountUsername: null,
    title: "Owned post",
    permalink: null,
    thumbnailUrl: null,
    mediaType: "short",
    publishedAt: "2026-08-02T12:00:00.000Z",
    metrics: {
      views: 100,
      likes: 10,
      comments: 2,
      shares: null,
      saves: null,
      reach: null,
      watchTimeMinutes: null,
    },
  };
}

async function run() {
  const consentStorage = createMemoryIntegrationStorage();
  const consentNow = new Date("2026-08-03T10:00:00.000Z");
  await assert.rejects(
    () =>
      beginOAuthConnection("youtube", {
        env: youtubeEnv,
        storage: consentStorage,
        now: consentNow,
      }),
    YouTubePolicyConsentRequiredError,
    "YouTube OAuth must not start without explicit server-validated consent"
  );
  const preConsentStatus = await getPublicIntegrationStatus("youtube", {
    env: youtubeEnv,
    storage: consentStorage,
    now: consentNow,
  });
  assert.equal(preConsentStatus.youtubeCompliance?.consentAccepted, false);
  assert.equal(
    preConsentStatus.youtubeCompliance?.privacyPolicyUrl,
    "https://postforge.example/privacy"
  );
  assert.equal(
    preConsentStatus.youtubeCompliance?.termsUrl,
    "https://postforge.example/terms"
  );
  assert.equal(
    preConsentStatus.youtubeCompliance?.dataDeletionUrl,
    "https://postforge.example/data-deletion"
  );
  const consentStart = await beginOAuthConnection("youtube", {
    env: youtubeEnv,
    storage: consentStorage,
    now: consentNow,
    youtubePolicyConsent: true,
  });
  assert.equal(
    new URL(consentStart.authorizationUrl).origin,
    "https://accounts.google.com"
  );
  await assert.rejects(
    () =>
      completeOAuthConnection("youtube", "youtube-code", {
        env: youtubeEnv,
        storage: consentStorage,
        now: consentNow,
        fetch: async () => {
          throw new Error("Token exchange must not run without consumed state");
        },
      }),
    YouTubePolicyConsentRequiredError,
    "A client flag alone cannot authorize the callback"
  );
  const consumedOAuthState = await consumeProviderOAuthState(
    "youtube",
    consentStart.state.state,
    consentStart.state.cookieValue,
    { env: youtubeEnv, storage: consentStorage, now: consentNow }
  );
  assert.equal(
    consumedOAuthState.youtubePolicyAcceptance?.termsUrl,
    "https://postforge.example/terms"
  );
  let youtubeConnectFetches = 0;
  const consentedConnection = await completeOAuthConnection(
    "youtube",
    "youtube-code",
    {
      env: youtubeEnv,
      storage: consentStorage,
      now: consentNow,
      consumedOAuthState,
      fetch: async (input) => {
        youtubeConnectFetches += 1;
        if (String(input).includes("oauth2.googleapis.com/token")) {
          return Response.json({
            access_token: "youtube-access",
            refresh_token: "youtube-refresh",
            expires_in: 3600,
            scope:
              "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload",
            token_type: "Bearer",
          });
        }
        return Response.json({
          items: [
            {
              id: "youtube-channel",
              snippet: { title: "PostForge channel", customUrl: "@postforge" },
            },
          ],
        });
      },
    }
  );
  assert.equal(youtubeConnectFetches, 2);
  assert.equal(consentedConnection.youtubeCompliance?.consentAccepted, true);
  assert.equal(consentedConnection.capabilities.publish, true);
  assert.equal(consentedConnection.capabilities.metrics, true);

  const instagramReadinessStorage = createMemoryIntegrationStorage();
  await saveIntegrationConnection(
    connection({
      provider: "instagram",
      account: {
        id: "instagram-account",
        username: "creator",
        displayName: "Creator",
        avatarUrl: null,
        profileUrl: null,
      },
      grantedScopes: [
        "instagram_business_basic",
        "instagram_business_manage_insights",
        "instagram_business_content_publish",
      ],
      tokens: {
        accessToken: "instagram-access",
        refreshToken: null,
        expiresAt: "2026-09-03T10:00:00.000Z",
        refreshTokenExpiresAt: null,
        grantedScopes: [
          "instagram_business_basic",
          "instagram_business_manage_insights",
          "instagram_business_content_publish",
        ],
        tokenType: "Bearer",
      },
    }),
    key,
    instagramReadinessStorage
  );
  const instagramRuntimeUnavailable = await getPublicIntegrationStatus(
    "instagram",
    {
      env: instagramEnv,
      storage: instagramReadinessStorage,
      now: consentNow,
    }
  );
  assert.equal(instagramRuntimeUnavailable.connected, true);
  assert.equal(instagramRuntimeUnavailable.capabilities.metrics, true);
  assert.equal(instagramRuntimeUnavailable.capabilities.publish, false);
  assert.match(
    instagramRuntimeUnavailable.publishingUnavailableReason ?? "",
    /FFPROBE_PATH/
  );

  const storage = createMemoryIntegrationStorage();
  await saveIntegrationConnection(connection(), key, storage);
  let fetchCall = 0;
  const refreshThenFail: typeof fetch = async () => {
    fetchCall += 1;
    if (fetchCall === 1) {
      return Response.json({
        access_token: "fresh-access",
        refresh_token: "fresh-refresh",
        expires_in: 3600,
        scope: "user.info.basic,video.list",
      });
    }
    return Response.json({ error: { code: "provider_error" } }, { status: 500 });
  };

  await assert.rejects(
    () =>
      syncIntegrationProvider("tiktok", {
        env,
        storage,
        fetch: refreshThenFail,
        now: new Date("2026-08-03T12:00:00.000Z"),
      }),
    IntegrationSyncError
  );
  const afterFailedSync = await readIntegrationConnection(
    "tiktok",
    key,
    storage
  );
  assert.equal(afterFailedSync?.tokens.accessToken, "fresh-access");
  assert.equal(afterFailedSync?.tokens.refreshToken, "fresh-refresh");
  assert.equal(afterFailedSync?.sync.status, "error");

  await saveProviderMetrics(
    {
      version: 1,
      provider: "tiktok",
      posts: [post("account-current")],
      syncedAt: "2026-08-03T12:00:00.000Z",
    },
    storage
  );
  await saveProviderMetrics(
    {
      version: 1,
      provider: "instagram",
      posts: [post("orphan-account", "instagram")],
      syncedAt: "2026-08-03T13:00:00.000Z",
    },
    storage
  );
  const performance = await getIntegrationPerformanceResponse({ env, storage });
  assert.deepEqual(performance.posts.map((item) => item.provider), ["tiktok"]);
  assert.equal(performance.lastUpdatedAt, "2026-08-03T12:00:00.000Z");
  assert.equal(
    performance.providers.find((item) => item.provider === "instagram")
      ?.configuration,
    "not_configured"
  );

  assert.equal(
    youtubeProviderDataIsFresh(
      "2026-07-05T12:00:00.000Z",
      new Date("2026-08-03T12:00:00.000Z")
    ),
    true
  );
  assert.equal(
    youtubeProviderDataIsFresh(
      "2026-07-04T12:00:00.000Z",
      new Date("2026-08-03T12:00:00.000Z")
    ),
    false,
    "YouTube-derived data must be refreshed or deleted at 30 days"
  );
  const staleYouTubeStorage = createMemoryIntegrationStorage();
  const youtubeConnection = connection({
    provider: "youtube",
    account: {
      id: "youtube-account",
      username: "@channel",
      displayName: "Channel",
      avatarUrl: null,
      profileUrl: "https://www.youtube.com/channel/youtube-account",
    },
    grantedScopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.upload",
    ],
    tokens: {
      accessToken: "youtube-access",
      refreshToken: "youtube-refresh",
      expiresAt: "2026-08-03T18:00:00.000Z",
      refreshTokenExpiresAt: null,
      grantedScopes: [
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/youtube.upload",
      ],
      tokenType: "Bearer",
    },
  });
  await saveIntegrationConnection(
    youtubeConnection,
    key,
    staleYouTubeStorage
  );
  const legacyYouTubeStatus = await getPublicIntegrationStatus("youtube", {
    env: youtubeEnv,
    storage: staleYouTubeStorage,
    now: new Date("2026-08-03T12:00:00.000Z"),
  });
  assert.equal(legacyYouTubeStatus.connected, true);
  assert.equal(legacyYouTubeStatus.youtubeCompliance?.consentAccepted, false);
  assert.equal(
    legacyYouTubeStatus.authorization.status,
    "reauthorization_required"
  );
  assert.deepEqual(legacyYouTubeStatus.capabilities, {
    profile: false,
    ownedMedia: false,
    metrics: false,
    publish: false,
  });
  let legacyApiCalls = 0;
  await assert.rejects(
    () =>
      syncIntegrationProvider("youtube", {
        env: youtubeEnv,
        storage: staleYouTubeStorage,
        now: new Date("2026-08-03T12:00:00.000Z"),
        fetch: async () => {
          legacyApiCalls += 1;
          return Response.json({});
        },
      }),
    YouTubePolicyConsentRequiredError,
    "Legacy YouTube grants must not expose API features before re-consent"
  );
  assert.equal(legacyApiCalls, 0);
  await saveProviderMetrics(
    {
      version: 1,
      provider: "youtube",
      posts: [post("youtube-account", "youtube")],
      syncedAt: "2026-07-03T12:00:00.000Z",
    },
    staleYouTubeStorage
  );
  const staleYouTubePerformance = await getIntegrationPerformanceResponse({
    env: youtubeEnv,
    storage: staleYouTubeStorage,
    now: new Date("2026-08-03T12:00:00.000Z"),
  });
  assert.deepEqual(staleYouTubePerformance.posts, []);
  assert.equal(
    await readProviderMetrics("youtube", staleYouTubeStorage),
    null,
    "stale YouTube API data is purged before display or export"
  );

  const revokedYouTubeStorage = createMemoryIntegrationStorage();
  await saveIntegrationConnection(
    {
      ...youtubeConnection,
      authorization: {
        status: "reauthorization_required",
        lastCheckedAt: "2026-08-03T12:00:00.000Z",
      },
    },
    key,
    revokedYouTubeStorage
  );
  await saveProviderMetrics(
    {
      version: 1,
      provider: "youtube",
      posts: [post("youtube-account", "youtube")],
      syncedAt: "2026-08-03T11:00:00.000Z",
    },
    revokedYouTubeStorage
  );
  const revokedYouTubePerformance = await getIntegrationPerformanceResponse({
    env: youtubeEnv,
    storage: revokedYouTubeStorage,
    now: new Date("2026-08-03T12:00:00.000Z"),
  });
  assert.deepEqual(revokedYouTubePerformance.posts, []);
  assert.equal(
    await readProviderMetrics("youtube", revokedYouTubeStorage),
    null,
    "revoked YouTube authorization purges cached provider data"
  );

  await saveProviderMetrics(
    {
      version: 1,
      provider: "tiktok",
      posts: [post("old-account")],
      syncedAt: "2026-08-03T14:00:00.000Z",
    },
    storage
  );
  let reconnectCall = 0;
  const reconnectFetch: typeof fetch = async (input) => {
    reconnectCall += 1;
    const url = String(input);
    if (url.includes("oauth/token")) {
      return Response.json({
        access_token: "new-account-token",
        refresh_token: "new-account-refresh",
        expires_in: 3600,
        scope: "user.info.basic,video.list,video.publish",
      });
    }
    return Response.json({
      data: {
        user: {
          open_id: "new-account",
          display_name: "New creator",
        },
      },
      error: { code: "ok" },
    });
  };
  const reconnected = await completeOAuthConnection("tiktok", "oauth-code", {
    env,
    storage,
    fetch: reconnectFetch,
    now: new Date("2026-08-03T15:00:00.000Z"),
  });
  assert.equal(reconnected.account?.id, "new-account");
  assert.equal(reconnected.connected, true);
  assert.equal(reconnected.sync.status, "never");
  assert.equal(reconnectCall, 2);
  const afterReconnect = await getIntegrationPerformanceResponse({ env, storage });
  assert.deepEqual(afterReconnect.posts, []);
  assert.equal(afterReconnect.lastUpdatedAt, null);

  const statuses = await getIntegrationsResponse({ env, storage });
  const serialized = JSON.stringify(statuses);
  assert.doesNotMatch(serialized, /new-account-token|new-account-refresh/);
  assert.equal(statuses.providers.length, 3);
  assert.equal(
    statuses.providers.find((item) => item.provider === "tiktok")
      ?.capabilities.publish,
    true
  );

  const invalidKeyStatus = await getPublicIntegrationStatus("tiktok", {
    env: { ...env, INTEGRATION_ENCRYPTION_KEY: "not-a-32-byte-key" },
    storage,
  });
  assert.equal(invalidKeyStatus.configuration, "not_configured");
  assert.equal(invalidKeyStatus.connected, false);

  const rotatedKeyStatus = await getPublicIntegrationStatus("tiktok", {
    env: {
      ...env,
      INTEGRATION_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
    },
    storage,
  });
  assert.equal(rotatedKeyStatus.configuration, "ready");
  assert.equal(rotatedKeyStatus.connected, false);
  assert.equal(
    rotatedKeyStatus.authorization.status,
    "reauthorization_required"
  );
  assert.equal(rotatedKeyStatus.sync.status, "error");
  assert.match(rotatedKeyStatus.sync.warnings[0] ?? "", /Reconnect/);

  const invalidGrantStorage = createMemoryIntegrationStorage();
  await saveIntegrationConnection(
    connection({
      provider: "tiktok",
      tokens: {
        accessToken: "expired-access",
        refreshToken: "expired-refresh",
        expiresAt: "2026-08-03T11:00:00.000Z",
        refreshTokenExpiresAt: null,
        grantedScopes: ["user.info.basic", "video.list"],
        tokenType: "Bearer",
      },
    }),
    key,
    invalidGrantStorage
  );
  await assert.rejects(
    () =>
      syncIntegrationProvider("tiktok", {
        env,
        storage: invalidGrantStorage,
        now: new Date("2026-08-03T12:00:00.000Z"),
        fetch: async () =>
          Response.json({ error: "invalid_grant" }, { status: 400 }),
      }),
    IntegrationSyncError
  );
  const invalidGrantConnection = await readIntegrationConnection(
    "tiktok",
    key,
    invalidGrantStorage
  );
  assert.equal(
    invalidGrantConnection?.authorization.status,
    "reauthorization_required"
  );

  const concurrentStorage = createMemoryIntegrationStorage();
  const concurrentContext = concurrentStorage.createContext();
  await saveIntegrationConnection(
    connection({
      tokens: {
        accessToken: "current-access",
        refreshToken: "current-refresh",
        expiresAt: "2026-08-03T18:00:00.000Z",
        refreshTokenExpiresAt: "2026-09-03T11:00:00.000Z",
        grantedScopes: ["user.info.basic", "video.list"],
        tokenType: "Bearer",
      },
    }),
    key,
    concurrentStorage
  );
  let releaseOlderSync!: () => void;
  let announceOlderSync!: () => void;
  const olderSyncStarted = new Promise<void>((resolve) => {
    announceOlderSync = resolve;
  });
  const olderSyncGate = new Promise<void>((resolve) => {
    releaseOlderSync = resolve;
  });
  const olderSync = syncIntegrationProvider("tiktok", {
    env,
    storage: concurrentStorage,
    now: new Date("2026-08-03T12:00:00.000Z"),
    fetch: async (input) => {
      if (String(input).includes("user/info")) {
        announceOlderSync();
        await olderSyncGate;
        return Response.json({
          data: {
            user: {
              open_id: "account-current",
              display_name: "Older sync result",
            },
          },
          error: { code: "ok" },
        });
      }
      return Response.json({
        data: { videos: [], cursor: 0, has_more: false },
        error: { code: "ok" },
      });
    },
  });
  await olderSyncStarted;
  const newerSync = await syncIntegrationProvider("tiktok", {
    env,
    storage: concurrentContext,
    now: new Date("2026-08-03T12:01:00.000Z"),
    fetch: async (input) => {
      if (String(input).includes("user/info")) {
        return Response.json({
          data: {
            user: {
              open_id: "account-current",
              display_name: "Newer sync result",
            },
          },
          error: { code: "ok" },
        });
      }
      return Response.json({
        data: { videos: [], cursor: 0, has_more: false },
        error: { code: "ok" },
      });
    },
  });
  assert.equal(newerSync.provider.account?.displayName, "Newer sync result");
  releaseOlderSync();
  await assert.rejects(
    () => olderSync,
    IntegrationMutationSupersededError
  );
  const afterConcurrentSync = await readIntegrationConnection(
    "tiktok",
    key,
    concurrentContext
  );
  assert.equal(afterConcurrentSync?.account.displayName, "Newer sync result");
  assert.equal(afterConcurrentSync?.sync.lastSuccessfulAt, "2026-08-03T12:01:00.000Z");

  const disconnectWinsStorage = createMemoryIntegrationStorage();
  const disconnectWinsContext = disconnectWinsStorage.createContext();
  await saveIntegrationConnection(
    connection({
      tokens: {
        accessToken: "disconnect-me-access",
        refreshToken: "disconnect-me-refresh",
        expiresAt: "2026-08-03T18:00:00.000Z",
        refreshTokenExpiresAt: null,
        grantedScopes: ["user.info.basic", "video.list"],
        tokenType: "Bearer",
      },
    }),
    key,
    disconnectWinsStorage
  );
  await saveProviderMetrics(
    {
      version: 1,
      provider: "tiktok",
      posts: [post("account-current")],
      syncedAt: "2026-08-03T12:00:00.000Z",
    },
    disconnectWinsStorage
  );
  let releaseInFlightSync!: () => void;
  let announceInFlightSync!: () => void;
  const inFlightSyncStarted = new Promise<void>((resolve) => {
    announceInFlightSync = resolve;
  });
  const inFlightSyncGate = new Promise<void>((resolve) => {
    releaseInFlightSync = resolve;
  });
  const inFlightSync = syncIntegrationProvider("tiktok", {
    env,
    storage: disconnectWinsStorage,
    now: new Date("2026-08-03T13:00:00.000Z"),
    fetch: async (input) => {
      if (String(input).includes("user/info")) {
        announceInFlightSync();
        await inFlightSyncGate;
        return Response.json({
          data: {
            user: {
              open_id: "account-current",
              display_name: "Stale sync",
            },
          },
          error: { code: "ok" },
        });
      }
      return Response.json({
        data: { videos: [], cursor: 0, has_more: false },
        error: { code: "ok" },
      });
    },
  });
  await inFlightSyncStarted;
  let disconnectRevokeToken: string | null = null;
  const disconnectedDuringSync = await disconnectIntegrationProvider("tiktok", {
    env,
    storage: disconnectWinsContext,
    fetch: async (input, init) => {
      assert.equal(
        String(input),
        "https://open.tiktokapis.com/v2/oauth/revoke/"
      );
      disconnectRevokeToken = new URLSearchParams(String(init?.body)).get(
        "token"
      );
      return new Response(null, { status: 200 });
    },
  });
  assert.equal(disconnectedDuringSync.connected, false);
  assert.equal(disconnectRevokeToken, "disconnect-me-access");
  assert.equal(
    await readIntegrationConnection("tiktok", key, disconnectWinsStorage),
    null
  );
  assert.equal(await readProviderMetrics("tiktok", disconnectWinsStorage), null);
  releaseInFlightSync();
  await assert.rejects(
    () => inFlightSync,
    IntegrationMutationSupersededError
  );
  assert.equal(
    await readIntegrationConnection("tiktok", key, disconnectWinsContext),
    null,
    "an in-flight sync from another context must not recreate a disconnected account"
  );

  const reconnectDisconnectStorage = createMemoryIntegrationStorage();
  const reconnectDisconnectContext = reconnectDisconnectStorage.createContext();
  let releaseReconnect!: () => void;
  let announceReconnect!: () => void;
  const reconnectStarted = new Promise<void>((resolve) => {
    announceReconnect = resolve;
  });
  const reconnectGate = new Promise<void>((resolve) => {
    releaseReconnect = resolve;
  });
  let reconnectRevoked = false;
  const inFlightReconnect = completeOAuthConnection("tiktok", "new-code", {
    env,
    storage: reconnectDisconnectStorage,
    now: new Date("2026-08-03T16:00:00.000Z"),
    fetch: async (input) => {
      if (String(input).includes("oauth/token")) {
        announceReconnect();
        await reconnectGate;
        return Response.json({
          access_token: "connected-before-disconnect",
          refresh_token: "connected-refresh",
          expires_in: 3600,
          scope: "user.info.basic,video.list",
        });
      }
      if (String(input).includes("oauth/revoke")) {
        reconnectRevoked = true;
        return new Response(null, { status: 200 });
      }
      return Response.json({
        data: { user: { open_id: "serialized-account", display_name: "Serialized creator" } },
        error: { code: "ok" },
      });
    },
  });
  await reconnectStarted;
  const disconnected = await disconnectIntegrationProvider("tiktok", {
    env,
    storage: reconnectDisconnectContext,
  });
  assert.equal(disconnected.connected, false);
  releaseReconnect();
  await assert.rejects(
    () => inFlightReconnect,
    IntegrationMutationSupersededError
  );
  assert.equal(reconnectRevoked, true);
  assert.equal(
    await readIntegrationConnection("tiktok", key, reconnectDisconnectStorage),
    null,
    "an in-flight reconnect from another context must not recreate a disconnected account"
  );

  const revokeFailureStorage = createMemoryIntegrationStorage();
  await saveIntegrationConnection(connection(), key, revokeFailureStorage);
  await saveProviderMetrics(
    {
      version: 1,
      provider: "tiktok",
      posts: [post("account-current")],
      syncedAt: "2026-08-03T12:00:00.000Z",
    },
    revokeFailureStorage
  );
  await assert.rejects(
    () =>
      disconnectIntegrationProvider("tiktok", {
        env,
        storage: revokeFailureStorage,
        fetch: async () =>
          Response.json(
            { error: "temporarily_unavailable" },
            { status: 503 }
          ),
      }),
    IntegrationDisconnectError
  );
  const retainedAfterRevokeFailure = await readIntegrationConnection(
    "tiktok",
    key,
    revokeFailureStorage
  );
  assert.equal(retainedAfterRevokeFailure?.tokens.accessToken, "expired-access");
  assert.notEqual(
    await readProviderMetrics("tiktok", revokeFailureStorage),
    null
  );
  const forceDeleted = await forceDeleteLocalIntegrationData("tiktok", {
    env: { INTEGRATION_ENCRYPTION_KEY: key.toString("base64") },
    storage: revokeFailureStorage,
    automationRecords: [],
  });
  assert.equal(forceDeleted.connected, false);
  assert.equal(
    await readIntegrationConnection("tiktok", key, revokeFailureStorage),
    null
  );
  assert.equal(await readProviderMetrics("tiktok", revokeFailureStorage), null);

  await saveIntegrationConnection(connection(), key, revokeFailureStorage);
  await saveProviderMetrics(
    {
      version: 1,
      provider: "tiktok",
      posts: [post("account-current")],
      syncedAt: "2026-08-03T12:00:00.000Z",
    },
    revokeFailureStorage
  );
  const retriedDisconnect = await disconnectIntegrationProvider("tiktok", {
    env,
    storage: revokeFailureStorage,
    fetch: async () => new Response(null, { status: 200 }),
  });
  assert.equal(retriedDisconnect.connected, false);
  assert.equal(
    await readIntegrationConnection("tiktok", key, revokeFailureStorage),
    null
  );
  assert.equal(await readProviderMetrics("tiktok", revokeFailureStorage), null);

  const errorResponse = integrationJsonError(
    new Error("provider secret should never reach the browser")
  );
  assert.equal(errorResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(await errorResponse.json(), {
    error: "Integration request failed",
  });
  const disconnectErrorResponse = integrationJsonError(
    new IntegrationDisconnectError()
  );
  assert.equal(disconnectErrorResponse.status, 502);
  assert.equal(
    disconnectErrorResponse.headers.get("cache-control"),
    "no-store"
  );
  assert.deepEqual(await disconnectErrorResponse.json(), {
    error:
      "Provider revocation failed; the connection was kept so you can retry",
  });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
