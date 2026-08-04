import type { ProviderOAuthConfig } from "../config";
import type {
  OAuthTokenSet,
  OwnedPostMetrics,
  PublicOwnedPostMetric,
} from "../types";
import {
  emptyOwnedPostMetrics,
  expiresAt,
  nullableNumber,
  nullableString,
  safeHttpUrl,
  parseGrantedScopes,
  providerJson,
} from "./http";
import { IntegrationProviderError } from "./http";
import type {
  IntegrationProviderAdapter,
  ProviderRequestOptions,
} from "./types";

type InstagramTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  permissions?: string | string[];
};

type InstagramTokenExchangeEnvelope = InstagramTokenResponse & {
  data?: InstagramTokenResponse[];
};

function grantedScopes(response: InstagramTokenResponse) {
  return parseGrantedScopes(response.scope ?? response.permissions);
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      async () => {
        while (nextIndex < values.length) {
          const index = nextIndex;
          nextIndex += 1;
          results[index] = await mapper(values[index]);
        }
      }
    )
  );
  return results;
}

export const instagramAdapter: IntegrationProviderAdapter = {
  provider: "instagram",

  buildAuthorizationUrl(config, state) {
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes.join(","),
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
    const tokenForm = new FormData();
    tokenForm.set("client_id", config.clientId);
    tokenForm.set("client_secret", config.clientSecret);
    tokenForm.set("grant_type", "authorization_code");
    tokenForm.set("redirect_uri", config.redirectUri);
    tokenForm.set("code", code);
    const shortLivedEnvelope = await providerJson<InstagramTokenExchangeEnvelope>(
      "Instagram",
      "token exchange",
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        body: tokenForm,
      },
      options.fetch
    );
    const shortLived = shortLivedEnvelope.data?.[0] ?? shortLivedEnvelope;
    if (!shortLived.access_token) {
      throw new Error("Instagram token response was incomplete");
    }

    const exchangeUrl = new URL("https://graph.instagram.com/access_token");
    exchangeUrl.search = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: config.clientSecret,
    }).toString();
    const longLived = await providerJson<InstagramTokenResponse>(
      "Instagram",
      "long-lived token exchange",
      exchangeUrl,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${shortLived.access_token}` },
      },
      options.fetch
    );
    if (!longLived.access_token) {
      throw new Error("Instagram long-lived token response was incomplete");
    }
    return {
      accessToken: longLived.access_token,
      refreshToken: null,
      expiresAt: expiresAt(now, longLived.expires_in),
      refreshTokenExpiresAt: null,
      grantedScopes: [
        ...new Set([
          ...grantedScopes(shortLived),
          ...grantedScopes(longLived),
        ]),
      ],
      tokenType:
        nullableString(longLived.token_type) ??
        nullableString(shortLived.token_type),
    } satisfies OAuthTokenSet;
  },

  async refreshTokens(_config, current, options = {}) {
    const now = options.now ?? new Date();
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.search = new URLSearchParams({
      grant_type: "ig_refresh_token",
    }).toString();
    const response = await providerJson<InstagramTokenResponse>(
      "Instagram",
      "token refresh",
      url,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${current.accessToken}` },
      },
      options.fetch
    );
    if (!response.access_token) {
      throw new Error("Instagram refresh response was incomplete");
    }
    return {
      accessToken: response.access_token,
      refreshToken: null,
      expiresAt: expiresAt(now, response.expires_in),
      refreshTokenExpiresAt: null,
      grantedScopes:
        grantedScopes(response).length > 0
          ? grantedScopes(response)
          : current.grantedScopes,
      tokenType: nullableString(response.token_type) ?? current.tokenType,
    };
  },

  async revokeAccess(config, current, account, options = {}) {
    const response = await providerJson<{ success?: boolean }>(
      "Instagram",
      "access revocation",
      `https://graph.instagram.com/${config.instagramGraphVersion}/${encodeURIComponent(account.id)}/permissions`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${current.accessToken}` },
      },
      options.fetch
    );
    if (response.success !== true) {
      throw new IntegrationProviderError(
        "Instagram",
        "access revocation",
        502
      );
    }
  },

  async fetchAccount(config, accessToken, options = {}) {
    const url = new URL(
      `https://graph.instagram.com/${config.instagramGraphVersion}/me`
    );
    url.search = new URLSearchParams({
      fields: "user_id,username,name,profile_picture_url",
    }).toString();
    const response = await providerJson<{
      id?: string;
      user_id?: string;
      username?: string;
      name?: string;
      profile_picture_url?: string;
      data?: Array<{
        id?: string;
        user_id?: string;
        username?: string;
        name?: string;
        profile_picture_url?: string;
      }>;
    }>(
      "Instagram",
      "profile sync",
      url,
      { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } },
      options.fetch
    );
    const profile = response.data?.[0] ?? response;
    const id = profile.user_id ?? profile.id;
    if (!id) throw new Error("Instagram profile response was incomplete");
    const username = nullableString(profile.username);
    return {
      id,
      username,
      displayName: nullableString(profile.name),
      avatarUrl: safeHttpUrl(profile.profile_picture_url),
      profileUrl: username ? `https://www.instagram.com/${username}/` : null,
    };
  },

  async syncOwnedPosts(
    config,
    accessToken,
    account,
    scopes,
    options = {}
  ) {
    const media: Array<{
      id?: string;
      caption?: string;
      media_type?: string;
      media_product_type?: string;
      permalink?: string;
      thumbnail_url?: string;
      media_url?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
    }> = [];
    let after: string | null = null;

    for (let page = 0; page < 2; page += 1) {
      const pageUrl = new URL(
        `https://graph.instagram.com/${config.instagramGraphVersion}/me/media`
      );
      const pageParams = new URLSearchParams({
        fields:
          "id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count",
        limit: "50",
      });
      if (after) pageParams.set("after", after);
      pageUrl.search = pageParams.toString();
      const response: {
        data?: typeof media;
        paging?: { cursors?: { after?: string }; next?: string };
      } = await providerJson(
        "Instagram",
        "owned media sync",
        pageUrl,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        options.fetch
      );
      media.push(...(response.data ?? []));
      after = nullableString(response.paging?.cursors?.after);
      if (!after && response.paging?.next) {
        try {
          const providerNext = new URL(response.paging.next);
          if (providerNext.origin === "https://graph.instagram.com") {
            after = nullableString(providerNext.searchParams.get("after"));
          }
        } catch {
          after = null;
        }
      }
      if (!after) break;
    }

    const canReadInsights = scopes.includes(
      "instagram_business_manage_insights"
    );
    const mappedPosts = await mapWithConcurrency<
      (typeof media)[number],
      PublicOwnedPostMetric | null
    >(media, 5, async (item) => {
      if (!item.id) return null;
      const metrics: OwnedPostMetrics = {
        ...emptyOwnedPostMetrics(),
        likes: nullableNumber(item.like_count),
        comments: nullableNumber(item.comments_count),
      };
      if (canReadInsights) {
        try {
          const url = new URL(
            `https://graph.instagram.com/${config.instagramGraphVersion}/${encodeURIComponent(item.id)}/insights`
          );
          url.search = new URLSearchParams({
            metric: "views,reach,saved,shares",
          }).toString();
          const insights = await providerJson<{
            data?: Array<{
              name?: string;
              values?: Array<{ value?: number }>;
              total_value?: { value?: number };
            }>;
          }>(
            "Instagram",
            "media insights sync",
            url,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${accessToken}` },
            },
            options.fetch
          );
          const valueFor = (name: string) => {
            const metric = insights.data?.find((entry) => entry.name === name);
            return nullableNumber(
              metric?.total_value?.value ?? metric?.values?.[0]?.value
            );
          };
          metrics.views = valueFor("views");
          metrics.reach = valueFor("reach");
          metrics.saves = valueFor("saved");
          metrics.shares = valueFor("shares");
        } catch (cause) {
          if (
            cause instanceof IntegrationProviderError &&
            cause.kind === "authorization"
          ) {
            throw cause;
          }
          options.onWarning?.(
            "Some Instagram media insights were unavailable; base owned-media metrics were kept."
          );
        }
      }
      const mediaType =
        item.media_product_type === "REELS"
          ? "short"
          : item.media_type === "IMAGE"
          ? "image"
          : item.media_type === "CAROUSEL_ALBUM"
            ? "carousel"
            : item.media_type === "VIDEO"
              ? "video"
              : "unknown";
      return {
        id: `instagram:${item.id}`,
        provider: "instagram",
        externalId: item.id,
        accountId: account.id,
        accountUsername: account.username,
        title: nullableString(item.caption),
        permalink: safeHttpUrl(item.permalink),
        thumbnailUrl:
          safeHttpUrl(item.thumbnail_url) ?? safeHttpUrl(item.media_url),
        mediaType,
        publishedAt: nullableString(item.timestamp),
        metrics,
      } satisfies PublicOwnedPostMetric;
    });
    return mappedPosts.filter(
      (post): post is PublicOwnedPostMetric => post !== null
    );
  },
};
