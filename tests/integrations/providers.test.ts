import assert from "node:assert/strict";
import {
  deriveCapabilities,
  getProviderOAuthConfig,
  getYouTubeComplianceUrls,
  isValidRetentionCronSecret,
  INTEGRATION_PROVIDER_NAMES,
  INTEGRATION_PROVIDER_SCOPES,
} from "../../src/lib/integrations/config";
import {
  instagramAdapter,
  tiktokAdapter,
  youtubeAdapter,
} from "../../src/lib/integrations/providers";

const encryptionKey = Buffer.alloc(32, 4).toString("base64");
const env = {
  POSTFORGE_PUBLIC_URL: "https://postforge.example",
  INTEGRATION_ENCRYPTION_KEY: encryptionKey,
  TIKTOK_CLIENT_KEY: "tt-key",
  TIKTOK_CLIENT_SECRET: "tt-secret",
  INSTAGRAM_CLIENT_ID: "ig-id",
  INSTAGRAM_CLIENT_SECRET: "ig-secret",
  YOUTUBE_CLIENT_ID: "yt-id",
  YOUTUBE_CLIENT_SECRET: "yt-secret",
  POSTFORGE_PRIVACY_POLICY_URL: "https://postforge.example/privacy",
  POSTFORGE_TERMS_URL: "https://postforge.example/terms",
  POSTFORGE_DATA_DELETION_URL: "https://postforge.example/data-deletion",
  CRON_SECRET: "retention-secret-value",
};

async function run() {
  assert.equal(INTEGRATION_PROVIDER_NAMES.youtube, "YouTube");
  assert.deepEqual(INTEGRATION_PROVIDER_SCOPES.tiktok, [
    "user.info.basic",
    "video.list",
    "video.publish",
  ]);
  assert.deepEqual(INTEGRATION_PROVIDER_SCOPES.instagram, [
    "instagram_business_basic",
    "instagram_business_manage_insights",
    "instagram_business_content_publish",
  ]);
  assert.deepEqual(deriveCapabilities("tiktok", ["video.list"]), {
    profile: false,
    ownedMedia: true,
    metrics: true,
    publish: false,
  });
  assert.equal(
    deriveCapabilities("instagram", ["instagram_business_basic"]).publish,
    false
  );
  assert.equal(
    deriveCapabilities("youtube", [
      "https://www.googleapis.com/auth/youtube.upload",
    ]).publish,
    true
  );
  assert.equal(
    getProviderOAuthConfig("tiktok", {
      ...env,
      INTEGRATION_ENCRYPTION_KEY: "invalid-key",
    }),
    null
  );
  assert.equal(
    getProviderOAuthConfig("tiktok", {
      ...env,
      POSTFORGE_PUBLIC_URL: "http://postforge.example",
    }),
    null,
    "non-loopback OAuth origins must use HTTPS"
  );
  assert.equal(
    getProviderOAuthConfig("tiktok", {
      ...env,
      POSTFORGE_PUBLIC_URL: "https://10.0.0.1",
    }),
    null,
    "private-network origins must not advertise provider readiness"
  );
  assert.notEqual(
    getProviderOAuthConfig("tiktok", {
      ...env,
      POSTFORGE_PUBLIC_URL: "http://localhost:3000",
    }),
    null,
    "loopback HTTP remains available for local QA"
  );
  assert.equal(
    getProviderOAuthConfig("youtube", {
      ...env,
      POSTFORGE_PRIVACY_POLICY_URL: "",
    }),
    null,
    "YouTube OAuth stays unavailable without every public disclosure"
  );
  assert.equal(
    getProviderOAuthConfig("youtube", { ...env, CRON_SECRET: "" }),
    null,
    "YouTube OAuth stays unavailable when daily retention cannot authenticate"
  );
  assert.equal(isValidRetentionCronSecret("short"), false);
  assert.equal(isValidRetentionCronSecret(" retention-secret-value"), false);
  assert.equal(isValidRetentionCronSecret("retention-secret\nvalue"), false);
  assert.equal(isValidRetentionCronSecret("retention-secret-value"), true);
  assert.equal(
    getProviderOAuthConfig("youtube", {
      ...env,
      POSTFORGE_DATA_DELETION_URL: "http://localhost/delete",
    }),
    null,
    "local or non-HTTPS disclosures cannot satisfy production readiness"
  );
  assert.deepEqual(getYouTubeComplianceUrls(env), {
    privacyPolicy: "https://postforge.example/privacy",
    terms: "https://postforge.example/terms",
    dataDeletion: "https://postforge.example/data-deletion",
  });

  const tiktokConfig = getProviderOAuthConfig("tiktok", env)!;
  const tiktokAuth = new URL(
    tiktokAdapter.buildAuthorizationUrl(tiktokConfig, "signed-state")
  );
  assert.equal(tiktokAuth.origin, "https://www.tiktok.com");
  assert.equal(tiktokAuth.searchParams.get("client_key"), "tt-key");
  assert.equal(
    tiktokAuth.searchParams.get("scope"),
    "user.info.basic,video.list,video.publish"
  );
  assert.equal(tiktokAuth.searchParams.get("state"), "signed-state");

  const tiktokCalls: Array<{ url: string; init?: RequestInit }> = [];
  const tiktokFetch: typeof fetch = async (input, init) => {
    tiktokCalls.push({ url: String(input), init });
    if (String(input).includes("oauth/token")) {
      return Response.json({
        access_token: "tt-access",
        refresh_token: "tt-refresh",
        expires_in: 3600,
        refresh_expires_in: 86400,
        scope: "user.info.basic,video.list",
        token_type: "Bearer",
      });
    }
    return Response.json({
      data: {
        videos: [
          {
            id: "video-1",
            title: "Owned TikTok",
            share_url: "https://www.tiktok.com/t/video-1",
            create_time: 1722686400,
            view_count: 1200,
            like_count: 80,
            comment_count: 9,
            share_count: 5,
          },
        ],
        has_more: false,
      },
      error: { code: "ok" },
    });
  };
  const tiktokTokens = await tiktokAdapter.exchangeCode(
    tiktokConfig,
    "code",
    { fetch: tiktokFetch, now: new Date("2026-08-03T12:00:00.000Z") }
  );
  assert.equal(tiktokTokens.accessToken, "tt-access");
  assert.deepEqual(tiktokTokens.grantedScopes, [
    "user.info.basic",
    "video.list",
  ]);
  const tiktokPosts = await tiktokAdapter.syncOwnedPosts(
    tiktokConfig,
    "tt-access",
    {
      id: "open-id",
      username: null,
      displayName: "Creator",
      avatarUrl: null,
      profileUrl: null,
    },
    tiktokTokens.grantedScopes,
    { fetch: tiktokFetch }
  );
  assert.equal(tiktokPosts[0]?.mediaType, "short");
  assert.equal(tiktokPosts[0]?.metrics.views, 1200);
  await assert.rejects(
    () =>
      tiktokAdapter.syncOwnedPosts(
        tiktokConfig,
        "invalid-token",
        {
          id: "open-id",
          username: null,
          displayName: "Creator",
          avatarUrl: null,
          profileUrl: null,
        },
        tiktokTokens.grantedScopes,
        {
          fetch: async () =>
            Response.json({
              data: {},
              error: { code: "access_token_invalid", message: "invalid" },
            }),
        }
      ),
    /TikTok owned video sync failed/
  );
  assert.match(String(tiktokCalls[0]?.init?.body), /client_secret=tt-secret/);
  const tiktokRevokeCalls: Array<{ url: string; init?: RequestInit }> = [];
  await tiktokAdapter.revokeAccess(
    tiktokConfig,
    tiktokTokens,
    {
      id: "open-id",
      username: null,
      displayName: "Creator",
      avatarUrl: null,
      profileUrl: null,
    },
    {
      fetch: async (input, init) => {
        tiktokRevokeCalls.push({ url: String(input), init });
        return new Response(null, { status: 200 });
      },
    }
  );
  assert.equal(
    tiktokRevokeCalls[0]?.url,
    "https://open.tiktokapis.com/v2/oauth/revoke/"
  );
  assert.equal(tiktokRevokeCalls[0]?.init?.method, "POST");
  assert.equal(
    new Headers(tiktokRevokeCalls[0]?.init?.headers).get("content-type"),
    "application/x-www-form-urlencoded"
  );
  const tiktokRevokeBody = new URLSearchParams(
    String(tiktokRevokeCalls[0]?.init?.body)
  );
  assert.equal(tiktokRevokeBody.get("client_key"), "tt-key");
  assert.equal(tiktokRevokeBody.get("client_secret"), "tt-secret");
  assert.equal(tiktokRevokeBody.get("token"), "tt-access");
  assert.equal(tiktokRevokeCalls[0]?.url.includes("tt-access"), false);

  const instagramConfig = getProviderOAuthConfig("instagram", env)!;
  assert.equal(instagramConfig.instagramGraphVersion, "v23.0");
  const instagramAuth = new URL(
    instagramAdapter.buildAuthorizationUrl(instagramConfig, "state")
  );
  assert.equal(instagramAuth.origin, "https://www.instagram.com");
  assert.equal(
    instagramAuth.searchParams.get("scope"),
    "instagram_business_basic,instagram_business_manage_insights,instagram_business_content_publish"
  );
  let instagramRequest = 0;
  const instagramCalls: Array<{ url: string; init?: RequestInit }> = [];
  const instagramFetch: typeof fetch = async (input, init) => {
    instagramCalls.push({ url: String(input), init });
    instagramRequest += 1;
    if (instagramRequest === 1) {
      return Response.json({
        data: [{
          access_token: "ig-short",
          user_id: "ig-user",
          permissions:
            "instagram_business_basic,instagram_business_manage_insights,instagram_business_content_publish",
        }],
      });
    }
    if (instagramRequest === 2) {
      return Response.json({ access_token: "ig-long", expires_in: 5_184_000 });
    }
    if (instagramRequest === 3) {
      return Response.json({
        data: [
          {
            user_id: "ig-user",
            username: "creator",
            name: "Creator",
          },
        ],
      });
    }
    if (instagramRequest === 4) {
      return Response.json({
        data: [
          {
            id: "reel-1",
            caption: "Owned reel",
            media_type: "VIDEO",
            media_product_type: "REELS",
            permalink: "https://www.instagram.com/reel/reel-1/",
            timestamp: "2026-08-01T12:00:00Z",
            like_count: 22,
            comments_count: 3,
          },
        ],
      });
    }
    return Response.json({
      data: [
        { name: "views", values: [{ value: 400 }] },
        { name: "reach", values: [{ value: 320 }] },
        { name: "saved", values: [{ value: 18 }] },
        { name: "shares", values: [{ value: 7 }] },
      ],
    });
  };
  const instagramTokens = await instagramAdapter.exchangeCode(
    instagramConfig,
    "ig-code",
    { fetch: instagramFetch, now: new Date("2026-08-03T12:00:00Z") }
  );
  assert.equal(instagramTokens.accessToken, "ig-long");
  assert.equal(instagramCalls[0]?.init?.body instanceof FormData, true);
  const instagramTokenForm = instagramCalls[0]?.init?.body as FormData;
  assert.equal(instagramTokenForm.get("client_id"), "ig-id");
  assert.equal(instagramTokenForm.get("client_secret"), "ig-secret");
  assert.equal(instagramTokenForm.get("grant_type"), "authorization_code");
  assert.equal(instagramTokenForm.get("code"), "ig-code");
  assert.equal(instagramCalls[1]?.url.includes("ig-short"), false);
  assert.equal(
    new Headers(instagramCalls[1]?.init?.headers).get("authorization"),
    "Bearer ig-short"
  );
  assert.deepEqual(instagramTokens.grantedScopes, [
    "instagram_business_basic",
    "instagram_business_manage_insights",
    "instagram_business_content_publish",
  ]);
  const instagramRefreshCalls: Array<{ url: string; init?: RequestInit }> = [];
  const refreshedInstagramTokens = await instagramAdapter.refreshTokens(
    instagramConfig,
    instagramTokens,
    {
      now: new Date("2026-08-04T12:00:00Z"),
      fetch: async (input, init) => {
        instagramRefreshCalls.push({ url: String(input), init });
        return Response.json({ access_token: "ig-refreshed", expires_in: 5_184_000 });
      },
    }
  );
  assert.equal(refreshedInstagramTokens.accessToken, "ig-refreshed");
  assert.equal(instagramRefreshCalls[0]?.url.includes("ig-long"), false);
  assert.equal(
    new Headers(instagramRefreshCalls[0]?.init?.headers).get("authorization"),
    "Bearer ig-long"
  );
  const instagramAccount = await instagramAdapter.fetchAccount(
    instagramConfig,
    "ig-long",
    { fetch: instagramFetch }
  );
  assert.equal(instagramAccount.id, "ig-user");
  assert.equal(instagramAccount.username, "creator");
  const instagramPosts = await instagramAdapter.syncOwnedPosts(
    instagramConfig,
    "ig-long",
    instagramAccount,
    instagramTokens.grantedScopes,
    { fetch: instagramFetch }
  );
  assert.equal(instagramPosts[0]?.mediaType, "short");
  assert.equal(instagramPosts[0]?.metrics.views, 400);
  assert.equal(instagramPosts[0]?.metrics.saves, 18);
  const instagramDataCalls = instagramCalls.slice(2);
  assert.equal(
    instagramDataCalls.every((call) => !call.url.includes("access_token=")),
    true,
    "Instagram Graph data requests must not place bearer tokens in URLs"
  );
  assert.equal(
    instagramDataCalls.every(
      (call) =>
        (call.init?.headers as Record<string, string> | undefined)?.Authorization ===
        "Bearer ig-long"
    ),
    true
  );
  const instagramRevokeCalls: Array<{ url: string; init?: RequestInit }> = [];
  await instagramAdapter.revokeAccess(
    instagramConfig,
    instagramTokens,
    instagramAccount,
    {
      fetch: async (input, init) => {
        instagramRevokeCalls.push({ url: String(input), init });
        return Response.json({ success: true });
      },
    }
  );
  assert.equal(
    instagramRevokeCalls[0]?.url,
    "https://graph.instagram.com/v23.0/ig-user/permissions"
  );
  assert.equal(instagramRevokeCalls[0]?.init?.method, "DELETE");
  assert.equal(
    new Headers(instagramRevokeCalls[0]?.init?.headers).get("authorization"),
    "Bearer ig-long"
  );
  assert.equal(instagramRevokeCalls[0]?.url.includes("ig-long"), false);
  let expiredInstagramCall = 0;
  await assert.rejects(
    () =>
      instagramAdapter.syncOwnedPosts(
        instagramConfig,
        "expired-ig-token",
        instagramAccount,
        instagramTokens.grantedScopes,
        {
          fetch: async () => {
            expiredInstagramCall += 1;
            if (expiredInstagramCall === 1) {
              return Response.json({
                data: [{ id: "expired-reel", media_type: "VIDEO" }],
              });
            }
            return Response.json(
              { error: { code: 190, type: "OAuthException" } },
              { status: 400 }
            );
          },
        }
      ),
    /Instagram media insights sync failed/
  );

  const youtubeConfig = getProviderOAuthConfig("youtube", env)!;
  const youtubeAuth = new URL(
    youtubeAdapter.buildAuthorizationUrl(youtubeConfig, "state")
  );
  assert.equal(youtubeAuth.origin, "https://accounts.google.com");
  assert.match(
    youtubeAuth.searchParams.get("scope") ?? "",
    /youtube\.readonly/
  );
  assert.equal(youtubeAuth.searchParams.get("access_type"), "offline");

  const youtubeFetch: typeof fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/channels")) {
      return Response.json({
        items: [
          {
            id: "channel-1",
            snippet: { title: "Channel", customUrl: "@channel" },
            contentDetails: { relatedPlaylists: { uploads: "uploads-1" } },
          },
        ],
      });
    }
    if (url.pathname.endsWith("/playlistItems")) {
      return Response.json({
        items: [{ contentDetails: { videoId: "yt-video-1" } }],
      });
    }
    if (url.pathname.endsWith("/videos")) {
      return Response.json({
        items: [
          {
            id: "yt-video-1",
            snippet: {
              title: "Owned upload",
              publishedAt: "2026-08-01T10:00:00Z",
            },
            statistics: { viewCount: "900", likeCount: "45", commentCount: "6" },
          },
        ],
      });
    }
    return Response.json({
      columnHeaders: [
        { name: "video" },
        { name: "views" },
        { name: "likes" },
        { name: "comments" },
        { name: "shares" },
        { name: "estimatedMinutesWatched" },
      ],
      rows: [["yt-video-1", 1000, 50, 7, 12, 350]],
    });
  };
  const youtubePosts = await youtubeAdapter.syncOwnedPosts(
    youtubeConfig,
    "yt-access",
    {
      id: "channel-1",
      username: "@channel",
      displayName: "Channel",
      avatarUrl: null,
      profileUrl: "https://www.youtube.com/channel/channel-1",
    },
    [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
    { fetch: youtubeFetch, now: new Date("2026-08-03T12:00:00Z") }
  );
  assert.equal(youtubePosts[0]?.mediaType, "video");
  assert.equal(youtubePosts[0]?.metrics.views, 900);
  assert.equal(youtubePosts[0]?.metrics.shares, null);
  assert.equal(youtubePosts[0]?.metrics.watchTimeMinutes, null);
  const youtubeRevokeCalls: Array<{ url: string; init?: RequestInit }> = [];
  await youtubeAdapter.revokeAccess(
    youtubeConfig,
    {
      accessToken: "yt-access",
      refreshToken: "yt-refresh",
      expiresAt: null,
      refreshTokenExpiresAt: null,
      grantedScopes: ["https://www.googleapis.com/auth/youtube.readonly"],
      tokenType: "Bearer",
    },
    {
      id: "channel-1",
      username: "@channel",
      displayName: "Channel",
      avatarUrl: null,
      profileUrl: "https://www.youtube.com/channel/channel-1",
    },
    {
      fetch: async (input, init) => {
        youtubeRevokeCalls.push({ url: String(input), init });
        return new Response(null, { status: 200 });
      },
    }
  );
  assert.equal(
    youtubeRevokeCalls[0]?.url,
    "https://oauth2.googleapis.com/revoke"
  );
  assert.equal(youtubeRevokeCalls[0]?.init?.method, "POST");
  const youtubeRevokeBody = new URLSearchParams(
    String(youtubeRevokeCalls[0]?.init?.body)
  );
  assert.equal(youtubeRevokeBody.get("token"), "yt-refresh");
  assert.equal(youtubeRevokeCalls[0]?.url.includes("yt-refresh"), false);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
