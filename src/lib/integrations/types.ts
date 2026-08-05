export const INTEGRATION_PROVIDERS = [
  "tiktok",
  "instagram",
  "youtube",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export type IntegrationCapabilities = {
  profile: boolean;
  ownedMedia: boolean;
  metrics: boolean;
  publish: boolean;
};

export type PublicIntegrationAccount = {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
};

export type YouTubePolicyAcceptance = {
  version: 1;
  acceptedAt: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  dataDeletionUrl: string;
  youtubeTermsOfServiceUrl: "https://www.youtube.com/t/terms";
};

export type PublicYouTubeCompliance = {
  privacyPolicyUrl: string;
  termsUrl: string;
  dataDeletionUrl: string;
  youtubeTermsOfServiceUrl: "https://www.youtube.com/t/terms";
  consentAccepted: boolean;
  acceptedAt: string | null;
};

export type ConnectedIntegrationAccountStatus = {
  account: PublicIntegrationAccount;
  grantedScopes: string[];
  capabilities: IntegrationCapabilities;
  connectedAt: string | null;
  updatedAt: string | null;
  authorization: {
    status: "healthy" | "reauthorization_required" | "unknown";
    lastCheckedAt: string | null;
  };
  sync: {
    status: "never" | "ready" | "partial" | "error";
    lastAttemptAt: string | null;
    lastSuccessfulAt: string | null;
    warnings: string[];
  };
  /** Server runtime blocker distinct from an OAuth scope omission. */
  publishingUnavailableReason: string | null;
};

export type PublicIntegrationStatus = {
  provider: IntegrationProvider;
  displayName: string;
  configuration: "ready" | "not_configured";
  /** True when at least one account is connected. */
  connected: boolean;
  accountCount: number;
  accounts: ConnectedIntegrationAccountStatus[];
  youtubeCompliance: PublicYouTubeCompliance | null;
  connectUrl: string;
};

export type OwnedPostMetrics = {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  watchTimeMinutes: number | null;
};

export type PublicOwnedPostMetric = {
  id: string;
  provider: IntegrationProvider;
  externalId: string;
  accountId: string;
  accountUsername: string | null;
  title: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  mediaType: "video" | "image" | "carousel" | "short" | "unknown";
  publishedAt: string | null;
  metrics: OwnedPostMetrics;
};

export type IntegrationsResponse = {
  providers: PublicIntegrationStatus[];
};

export type IntegrationPerformanceResponse = IntegrationsResponse & {
  posts: PublicOwnedPostMetric[];
  lastUpdatedAt: string | null;
};

export type IntegrationSyncResponse = {
  provider: PublicIntegrationStatus;
  accountId: string;
  posts: PublicOwnedPostMetric[];
  syncedAt: string;
};

export type OAuthTokenSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  grantedScopes: string[];
  tokenType: string | null;
};

export type IntegrationAccount = PublicIntegrationAccount;

export type DecryptedIntegrationConnection = {
  version: 1;
  provider: IntegrationProvider;
  account: IntegrationAccount;
  grantedScopes: string[];
  tokens: OAuthTokenSet;
  connectedAt: string;
  updatedAt: string;
  authorization: {
    status: "healthy" | "reauthorization_required" | "unknown";
    lastCheckedAt: string | null;
  };
  sync: {
    status: "never" | "ready" | "partial" | "error";
    lastAttemptAt: string | null;
    lastSuccessfulAt: string | null;
    warnings: string[];
  };
  /**
   * Present only after a YouTube OAuth callback consumes the matching
   * server-owned consent-bearing state record. Older records intentionally
   * omit it and remain gated until the account is reconnected.
   */
  youtubePolicyAcceptance?: YouTubePolicyAcceptance | null;
};
