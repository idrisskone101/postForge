import {
  INTEGRATION_PROVIDERS,
  type IntegrationCapabilities,
  type IntegrationProvider,
} from "./types";

export { INTEGRATION_PROVIDERS } from "./types";

export const INTEGRATION_PROVIDER_NAMES: Record<IntegrationProvider, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
};

export const INTEGRATION_PROVIDER_SCOPES: Record<
  IntegrationProvider,
  readonly string[]
> = {
  tiktok: ["user.info.basic", "video.list", "video.publish"],
  instagram: [
    "instagram_business_basic",
    "instagram_business_manage_insights",
    "instagram_business_content_publish",
  ],
  youtube: [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.upload",
  ],
};

export type ProviderOAuthConfig = {
  provider: IntegrationProvider;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  publicUrl: string;
  scopes: readonly string[];
  instagramGraphVersion: string;
  tiktokDirectPostApprovalAcknowledged: boolean;
  youtubeComplianceUrls: YouTubeComplianceUrls | null;
};

export type YouTubeComplianceUrls = {
  privacyPolicy: string;
  terms: string;
  dataDeletion: string;
};

export type IntegrationEnvironment = Record<string, string | undefined>;

export function isIntegrationProvider(
  value: string
): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function hostSafety(hostnameValue: string) {
  const hostname = hostnameValue.toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4 = hostname.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  );
  const octets = ipv4?.slice(1).map(Number);
  const invalidOrPrivateIpv4 =
    octets &&
    (octets.some((part) => part < 0 || part > 255) ||
      octets[0] === 0 ||
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168));
  const privateIpv6 =
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:");
  const loopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";
  return {
    hostname,
    loopback,
    privateOrInvalid: Boolean(
      hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") ||
        invalidOrPrivateIpv4 ||
        privateIpv6
    ),
  };
}

export function getIntegrationPublicUrl(env: IntegrationEnvironment = process.env) {
  const value = env.POSTFORGE_PUBLIC_URL ?? env.NEXT_PUBLIC_BASE_URL ?? "";
  const candidate = trimTrailingSlash(value.trim());
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    const host = hostSafety(url.hostname);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      (url.protocol === "http:" && !host.loopback) ||
      (host.privateOrInvalid && !host.loopback) ||
      url.username ||
      url.password
    ) {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}

export function isValidIntegrationEncryptionKey(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  if (/^[a-fA-F0-9]{64}$/.test(normalized)) return true;
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(normalized)) return false;
  const withoutPadding = normalized.replace(/=+$/, "");
  if (withoutPadding.length % 4 === 1) return false;
  return Math.floor((withoutPadding.length * 6) / 8) === 32;
}

export function isValidRetentionCronSecret(value: string | undefined) {
  const secret = value ?? "";
  return /^[A-Za-z0-9._~+/-]{16,510}={0,2}$/.test(secret);
}

function publicHttpsUrl(value: string | undefined) {
  const candidate = value?.trim() ?? "";
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const host = hostSafety(url.hostname);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !host.hostname ||
      host.privateOrInvalid
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function getYouTubeComplianceUrls(
  env: IntegrationEnvironment = process.env
): YouTubeComplianceUrls | null {
  const privacyPolicy = publicHttpsUrl(env.POSTFORGE_PRIVACY_POLICY_URL);
  const terms = publicHttpsUrl(env.POSTFORGE_TERMS_URL);
  const dataDeletion = publicHttpsUrl(env.POSTFORGE_DATA_DELETION_URL);
  return privacyPolicy && terms && dataDeletion
    ? { privacyPolicy, terms, dataDeletion }
    : null;
}

function getProviderCredentials(
  provider: IntegrationProvider,
  env: IntegrationEnvironment
) {
  if (provider === "tiktok") {
    return {
      clientId: env.TIKTOK_CLIENT_KEY?.trim() ?? "",
      clientSecret: env.TIKTOK_CLIENT_SECRET?.trim() ?? "",
    };
  }
  if (provider === "instagram") {
    return {
      clientId: env.INSTAGRAM_CLIENT_ID?.trim() ?? "",
      clientSecret: env.INSTAGRAM_CLIENT_SECRET?.trim() ?? "",
    };
  }
  return {
    clientId: env.YOUTUBE_CLIENT_ID?.trim() ?? "",
    clientSecret: env.YOUTUBE_CLIENT_SECRET?.trim() ?? "",
  };
}

export function isProviderConfigured(
  provider: IntegrationProvider,
  env: IntegrationEnvironment = process.env
) {
  const credentials = getProviderCredentials(provider, env);
  const complianceReady =
    provider !== "youtube" ||
    (Boolean(getYouTubeComplianceUrls(env)) &&
      isValidRetentionCronSecret(env.CRON_SECRET));
  return Boolean(
    credentials.clientId &&
      credentials.clientSecret &&
      getIntegrationPublicUrl(env) &&
      isValidIntegrationEncryptionKey(env.INTEGRATION_ENCRYPTION_KEY) &&
      complianceReady
  );
}

export function getProviderOAuthConfig(
  provider: IntegrationProvider,
  env: IntegrationEnvironment = process.env
): ProviderOAuthConfig | null {
  if (!isProviderConfigured(provider, env)) return null;
  const publicUrl = getIntegrationPublicUrl(env);
  const credentials = getProviderCredentials(provider, env);

  return {
    provider,
    ...credentials,
    publicUrl,
    redirectUri: `${publicUrl}/api/integrations/${provider}/callback`,
    scopes: INTEGRATION_PROVIDER_SCOPES[provider],
    instagramGraphVersion:
      env.INSTAGRAM_GRAPH_API_VERSION?.trim() || "v23.0",
    tiktokDirectPostApprovalAcknowledged:
      env.TIKTOK_DIRECT_POST_APPROVAL_ACKNOWLEDGED?.trim().toLowerCase() ===
      "true",
    youtubeComplianceUrls:
      provider === "youtube" ? getYouTubeComplianceUrls(env) : null,
  };
}

export function deriveCapabilities(
  provider: IntegrationProvider,
  grantedScopes: readonly string[]
): IntegrationCapabilities {
  const scopes = new Set(grantedScopes);
  if (provider === "tiktok") {
    return {
      profile: scopes.has("user.info.basic"),
      ownedMedia: scopes.has("video.list"),
      metrics: scopes.has("video.list"),
      publish: scopes.has("video.publish"),
    };
  }
  if (provider === "instagram") {
    return {
      profile: scopes.has("instagram_business_basic"),
      ownedMedia: scopes.has("instagram_business_basic"),
      metrics: scopes.has("instagram_business_manage_insights"),
      publish: scopes.has("instagram_business_content_publish"),
    };
  }
  return {
    profile: scopes.has("https://www.googleapis.com/auth/youtube.readonly"),
    ownedMedia: scopes.has("https://www.googleapis.com/auth/youtube.readonly"),
    metrics:
      scopes.has("https://www.googleapis.com/auth/youtube.readonly") ||
      scopes.has("https://www.googleapis.com/auth/yt-analytics.readonly"),
    publish: scopes.has("https://www.googleapis.com/auth/youtube.upload"),
  };
}

export function emptyCapabilities(): IntegrationCapabilities {
  return { profile: false, ownedMedia: false, metrics: false, publish: false };
}
