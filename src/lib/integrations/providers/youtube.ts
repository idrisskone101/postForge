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
} from "./http";
import type {
  IntegrationProviderAdapter,
  ProviderRequestOptions,
} from "./types";

const DATA_API_ROOT = "https://www.googleapis.com/youtube/v3";
type YouTubeTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

function tokenSet(
  response: YouTubeTokenResponse,
  now: Date,
  current?: OAuthTokenSet
): OAuthTokenSet {
  if (!response.access_token) {
    throw new Error("YouTube token response was incomplete");
  }
  const scopes = parseGrantedScopes(response.scope);
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? current?.refreshToken ?? null,
    expiresAt: expiresAt(now, response.expires_in),
    refreshTokenExpiresAt: null,
    grantedScopes:
      scopes.length > 0 ? scopes : (current?.grantedScopes ?? []),
    tokenType: nullableString(response.token_type) ?? current?.tokenType ?? null,
  };
}

async function fetchChannel(accessToken: string, options: ProviderRequestOptions) {
  const url = new URL(`${DATA_API_ROOT}/channels`);
  url.search = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    mine: "true",
  }).toString();
  const response = await providerJson<{
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        customUrl?: string;
        thumbnails?: Record<string, { url?: string }>;
      };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  }>(
    "YouTube",
    "channel sync",
    url,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    options.fetch
  );
  const channel = response.items?.[0];
  if (!channel?.id) throw new Error("YouTube channel response was incomplete");
  return channel;
}

export const youtubeAdapter: IntegrationProviderAdapter = {
  provider: "youtube",

  buildAuthorizationUrl(config, state) {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(" "),
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
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
    const response = await providerJson<YouTubeTokenResponse>(
      "YouTube",
      "token exchange",
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
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
    if (!current.refreshToken) throw new Error("YouTube refresh token is missing");
    const now = options.now ?? new Date();
    const response = await providerJson<YouTubeTokenResponse>(
      "YouTube",
      "token refresh",
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          refresh_token: current.refreshToken,
          grant_type: "refresh_token",
        }),
      },
      options.fetch
    );
    return tokenSet(response, now, current);
  },

  async revokeAccess(_config, current, _account, options = {}) {
    await providerEmpty(
      "YouTube",
      "access revocation",
      "https://oauth2.googleapis.com/revoke",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: current.refreshToken ?? current.accessToken,
        }),
      },
      options.fetch
    );
  },

  async fetchAccount(_config, accessToken, options = {}) {
    const channel = await fetchChannel(accessToken, options);
    const username = nullableString(channel.snippet?.customUrl);
    const thumbnails = channel.snippet?.thumbnails ?? {};
    const avatarUrl =
      nullableString(thumbnails.high?.url) ??
      nullableString(thumbnails.medium?.url) ??
      nullableString(thumbnails.default?.url);
    return {
      id: channel.id!,
      username,
      displayName: nullableString(channel.snippet?.title),
      avatarUrl,
      profileUrl: `https://www.youtube.com/channel/${channel.id}`,
    };
  },

  async syncOwnedPosts(
    _config,
    accessToken,
    account,
    _scopes,
    options = {}
  ) {
    const channel = await fetchChannel(accessToken, options);
    const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return [];

    const videoIds: string[] = [];
    let pageToken: string | null = null;
    for (let page = 0; page < 2; page += 1) {
      const url = new URL(`${DATA_API_ROOT}/playlistItems`);
      const params = new URLSearchParams({
        part: "contentDetails",
        playlistId: uploads,
        maxResults: "50",
      });
      if (pageToken) params.set("pageToken", pageToken);
      url.search = params.toString();
      const response = await providerJson<{
        items?: Array<{ contentDetails?: { videoId?: string } }>;
        nextPageToken?: string;
      }>(
        "YouTube",
        "uploads sync",
        url,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        options.fetch
      );
      videoIds.push(
        ...(response.items ?? [])
          .map((item) => item.contentDetails?.videoId)
          .filter((id): id is string => Boolean(id))
      );
      pageToken = response.nextPageToken ?? null;
      if (!pageToken) break;
    }

    const posts: PublicOwnedPostMetric[] = [];
    for (let start = 0; start < videoIds.length; start += 50) {
      const ids = videoIds.slice(start, start + 50);
      const url = new URL(`${DATA_API_ROOT}/videos`);
      url.search = new URLSearchParams({
        part: "snippet,statistics,contentDetails",
        id: ids.join(","),
      }).toString();
      const response = await providerJson<{
        items?: Array<{
          id?: string;
          snippet?: {
            title?: string;
            publishedAt?: string;
            thumbnails?: Record<string, { url?: string }>;
          };
          statistics?: {
            viewCount?: string;
            likeCount?: string;
            commentCount?: string;
          };
        }>;
      }>(
        "YouTube",
        "video metrics sync",
        url,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        options.fetch
      );
      for (const video of response.items ?? []) {
        if (!video.id) continue;
        const thumbnails = video.snippet?.thumbnails ?? {};
        posts.push({
          id: `youtube:${video.id}`,
          provider: "youtube",
          externalId: video.id,
          accountId: account.id,
          accountUsername: account.username,
          title: nullableString(video.snippet?.title),
          permalink: `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`,
          thumbnailUrl:
            safeHttpUrl(thumbnails.maxres?.url) ??
            safeHttpUrl(thumbnails.high?.url) ??
            safeHttpUrl(thumbnails.medium?.url) ??
            safeHttpUrl(thumbnails.default?.url),
          mediaType: "video",
          publishedAt: nullableString(video.snippet?.publishedAt),
          metrics: {
            ...emptyOwnedPostMetrics(),
            views: nullableNumber(video.statistics?.viewCount),
            likes: nullableNumber(video.statistics?.likeCount),
            comments: nullableNumber(video.statistics?.commentCount),
          },
        });
      }
    }

    // Keep these values on one consistent basis: YouTube Data API statistics
    // are lifetime counters. Windowed Analytics metrics must be modeled and
    // labeled separately before they can safely appear in this response.
    return posts;
  },
};
