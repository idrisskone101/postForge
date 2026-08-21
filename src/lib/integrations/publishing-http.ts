import { IntegrationProviderError } from "./providers/http";
import type { ProviderFetch } from "./providers/types";
import { IntegrationMediaValidationError } from "./publishing-types";

export const PROVIDER_CONTROL_TIMEOUT_MS = 20_000;
export const YOUTUBE_UPLOAD_TIMEOUT_MS = 300_000;

export function parseRetryAfterMilliseconds(
  value: string | null,
  nowMs = Date.now()
) {
  if (!value) return null;
  const seconds = Number(value.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.round(seconds * 1000), 10_000);
  }
  const dateMs = Date.parse(value);
  if (!Number.isFinite(dateMs) || dateMs <= nowMs) return null;
  return Math.min(dateMs - nowMs, 10_000);
}

export function trustedProviderUrl(
  value: string,
  provider: "TikTok" | "YouTube",
  allowedHost: (hostname: string) => boolean
) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !allowedHost(url.hostname.toLowerCase())
    ) {
      throw new Error("Untrusted upload URL");
    }
    return url.toString();
  } catch {
    throw new IntegrationProviderError(provider, "upload session validation", 502);
  }
}

export async function providerBinaryRequest(
  provider: "TikTok" | "YouTube",
  operation: string,
  url: string,
  init: RequestInit,
  fetchImpl: ProviderFetch,
  kind?: "authorization" | "provider"
) {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(PROVIDER_CONTROL_TIMEOUT_MS),
    });
  } catch {
    throw new IntegrationProviderError(
      provider,
      operation,
      null,
      kind ?? "provider"
    );
  }
  if (!response.ok) {
    throw new IntegrationProviderError(
      provider,
      operation,
      response.status,
      kind ?? (response.status === 401 ? "authorization" : "provider")
    );
  }
  return response;
}

export function publicAssetUrl(
  value: string | undefined,
  provider: "TikTok" | "Instagram"
) {
  try {
    if (!value) throw new Error("Signed URL required");
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      isLocal
    ) {
      throw new Error("Public HTTPS URL required");
    }
    return url.toString();
  } catch {
    throw new IntegrationMediaValidationError(
      `${provider} publishing requires POSTFORGE_PUBLIC_URL to be a public HTTPS origin`
    );
  }
}
