import type { ProviderOAuthConfig } from "../config";
import type {
  IntegrationAccount,
  IntegrationProvider,
  OAuthTokenSet,
  PublicOwnedPostMetric,
} from "../types";

export type ProviderFetch = typeof fetch;

export type ProviderRequestOptions = {
  fetch?: ProviderFetch;
  now?: Date;
  onWarning?: (warning: string) => void;
};

export interface IntegrationProviderAdapter {
  readonly provider: IntegrationProvider;
  buildAuthorizationUrl(config: ProviderOAuthConfig, state: string): string;
  exchangeCode(
    config: ProviderOAuthConfig,
    code: string,
    options?: ProviderRequestOptions
  ): Promise<OAuthTokenSet>;
  refreshTokens(
    config: ProviderOAuthConfig,
    current: OAuthTokenSet,
    options?: ProviderRequestOptions
  ): Promise<OAuthTokenSet>;
  revokeAccess(
    config: ProviderOAuthConfig,
    current: OAuthTokenSet,
    account: IntegrationAccount,
    options?: ProviderRequestOptions
  ): Promise<void>;
  fetchAccount(
    config: ProviderOAuthConfig,
    accessToken: string,
    options?: ProviderRequestOptions
  ): Promise<IntegrationAccount>;
  syncOwnedPosts(
    config: ProviderOAuthConfig,
    accessToken: string,
    account: IntegrationAccount,
    grantedScopes: readonly string[],
    options?: ProviderRequestOptions
  ): Promise<PublicOwnedPostMetric[]>;
}
