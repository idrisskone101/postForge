import type { IntegrationProvider } from "../types";
import { instagramAdapter } from "./instagram";
import { tiktokAdapter } from "./tiktok";
import type { IntegrationProviderAdapter } from "./types";
import { youtubeAdapter } from "./youtube";

export const INTEGRATION_PROVIDER_ADAPTERS: Record<
  IntegrationProvider,
  IntegrationProviderAdapter
> = {
  tiktok: tiktokAdapter,
  instagram: instagramAdapter,
  youtube: youtubeAdapter,
};

export function getIntegrationProviderAdapter(provider: IntegrationProvider) {
  return INTEGRATION_PROVIDER_ADAPTERS[provider];
}

export { instagramAdapter } from "./instagram";
export { tiktokAdapter } from "./tiktok";
export { youtubeAdapter } from "./youtube";
export type {
  IntegrationProviderAdapter,
  ProviderFetch,
  ProviderRequestOptions,
} from "./types";
