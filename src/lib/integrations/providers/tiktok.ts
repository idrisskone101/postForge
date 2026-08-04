import type { ProviderOAuthConfig } from "../config";
import type { OAuthTokenSet, PublicOwnedPostMetric } from "../types";
import {
  emptyOwnedPostMetrics,
  expiresAt,
  nullableNumber,
  nullableString,
  safeHttpUrl,
  parseGrantedScopes,
  providerEmpty,
  providerJson,
  IntegrationProviderError,
} from "./http";
import type {
  IntegrationProviderAdapter,
  ProviderRequestOptions,
} from "./types";

const API_ROOT = "https://open.tiktokapis.com/v2";

type TikTokTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  scope?: string;
  token_type?: string;
};

type TikTokErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
};

function assertTikTokSuccess(
  response: TikTokErrorEnvelope,
  operation: string
) {
  const code = response.error?.code;
  if (code === "ok") return;
  const normalized = code?.toLowerCase() ?? "missing_error_envelope";
  const authorizationFailure =
    normalized.includes("access_token") ||
    normalized.includes("invalid_token") ||
    normalized.includes("scope_not_authorized") ||
    normalized.includes("unauthorized");
  throw new IntegrationProviderError(
    "TikTok",
    operation,
    authorizationFailure ? 401 : 502
  );
}

function tokenSet(
  response: TikTokTokenResponse,
  now: Date,
  previousRefreshToken: string | null = null
): OAuthTokenSet {
  if (!response.access_token) {
    throw new Error("TikTok token response was incomplete");
  }
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? previousRefreshToken,
    expiresAt: expiresAt(now, response.expires_in),
    refreshTokenExpiresAt: expiresAt(now, response.refresh_expires_in),
    grantedScopes: parseGrantedScopes(response.scope),
    tokenType: nullableString(response.token_type),
  };
}

export const tiktokAdapter: IntegrationProviderAdapter = {
  provider: "tiktok",

  buildAuthorizationUrl(config, state) {
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.search = new URLSearchParams({
      client_key: config.clientId,
      response_type: "code",
      scope: config.scopes.join(","),
      redirect_uri: config.redirectUri,
      state,
    }).toString();
    return url.toString();
  },

  async exchangeCode(
    config: ProviderOAuthConfig,
    code: string,
    options: ProviderRequestOptions = {}
  ) {
    const now = options.now ?? new Date();
    const response = await providerJson<TikTokTokenResponse>(
      "TikTok",
      "token exchange",
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: config.redirectUri,
        }),
      },
      options.fetch
    );
    return tokenSet(response, now);
  },

  async refreshTokens(config, current, options = {}) {
    if (!current.refreshToken) throw new Error("TikTok refresh token is missing");
    const now = options.now ?? new Date();
    const response = await providerJson<TikTokTokenResponse>(
      "TikTok",
      "token refresh",
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: config.clientId,
          client_secret: config.clientSecret,
          grant_type: "refresh_token",
          refresh_token: current.refreshToken,
        }),
      },
      options.fetch
    );
    const refreshed = tokenSet(response, now, current.refreshToken);
    return {
      ...refreshed,
      grantedScopes:
        refreshed.grantedScopes.length > 0
          ? refreshed.grantedScopes
          : current.grantedScopes,
      refreshTokenExpiresAt:
        refreshed.refreshTokenExpiresAt ?? current.refreshTokenExpiresAt,
    };
  },

  async revokeAccess(config, current, _account, options = {}) {
    await providerEmpty(
      "TikTok",
      "access revocation",
      "https://open.tiktokapis.com/v2/oauth/revoke/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: config.clientId,
          client_secret: config.clientSecret,
          token: current.accessToken,
        }),
      },
      options.fetch
    );
  },

  async fetchAccount(_config, accessToken, options = {}) {
    const response = await providerJson<{
      data?: {
        user?: {
          open_id?: string;
          display_name?: string;
          avatar_url?: string;
        };
      };
      error?: TikTokErrorEnvelope["error"];
    }>(
      "TikTok",
      "profile sync",
      `${API_ROOT}/user/info/?fields=open_id,display_name,avatar_url`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      options.fetch
    );
    assertTikTokSuccess(response, "profile sync");
    const user = response.data?.user;
    if (!user?.open_id) throw new Error("TikTok profile response was incomplete");
    return {
      id: user.open_id,
      username: null,
      displayName: nullableString(user.display_name),
      avatarUrl: safeHttpUrl(user.avatar_url),
      profileUrl: null,
    };
  },

  async syncOwnedPosts(
    _config,
    accessToken,
    account,
    _grantedScopes,
    options = {}
  ) {
    const posts: PublicOwnedPostMetric[] = [];
    let cursor: number | null = null;
    let hasMore = true;

    for (let page = 0; page < 5 && hasMore; page += 1) {
      const body: { max_count: number; cursor?: number } = { max_count: 20 };
      if (cursor !== null) body.cursor = cursor;
      const response = await providerJson<{
        data?: {
          videos?: Array<{
            id?: string;
            title?: string;
            video_description?: string;
            cover_image_url?: string;
            share_url?: string;
            embed_link?: string;
            create_time?: number;
            view_count?: number;
            like_count?: number;
            comment_count?: number;
            share_count?: number;
          }>;
          cursor?: number;
          has_more?: boolean;
        };
        error?: TikTokErrorEnvelope["error"];
      }>(
        "TikTok",
        "owned video sync",
        `${API_ROOT}/video/list/?fields=id,title,video_description,cover_image_url,share_url,embed_link,create_time,view_count,like_count,comment_count,share_count`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        options.fetch
      );
      assertTikTokSuccess(response, "owned video sync");
      for (const video of response.data?.videos ?? []) {
        if (!video.id) continue;
        posts.push({
          id: `tiktok:${video.id}`,
          provider: "tiktok",
          externalId: video.id,
          accountId: account.id,
          accountUsername: account.username,
          title:
            nullableString(video.title) ?? nullableString(video.video_description),
          permalink:
            safeHttpUrl(video.share_url) ?? safeHttpUrl(video.embed_link),
          thumbnailUrl: safeHttpUrl(video.cover_image_url),
          mediaType: "short",
          publishedAt:
            typeof video.create_time === "number"
              ? new Date(video.create_time * 1000).toISOString()
              : null,
          metrics: {
            ...emptyOwnedPostMetrics(),
            views: nullableNumber(video.view_count),
            likes: nullableNumber(video.like_count),
            comments: nullableNumber(video.comment_count),
            shares: nullableNumber(video.share_count),
          },
        });
      }
      hasMore = response.data?.has_more === true;
      cursor = nullableNumber(response.data?.cursor);
      if (hasMore && cursor === null) break;
    }
    return posts;
  },
};
