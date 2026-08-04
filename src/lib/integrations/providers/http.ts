import type { ProviderFetch } from "./types";

export class IntegrationProviderError extends Error {
  readonly provider: string;
  readonly operation: string;
  readonly status: number | null;
  readonly kind: "authorization" | "provider";

  constructor(
    provider: string,
    operation: string,
    status: number | null = null,
    kind: "authorization" | "provider" =
      status === 401 || status === 403 ? "authorization" : "provider"
  ) {
    super(`${provider} ${operation} failed`);
    this.name = "IntegrationProviderError";
    this.provider = provider;
    this.operation = operation;
    this.status = status;
    this.kind = kind;
  }
}

const AUTHORIZATION_ERROR_CODES = new Set([
  "invalid_grant",
  "invalid_token",
  "access_token_invalid",
  "expired_token",
  "token_expired",
]);

function providerErrorKind(value: unknown): "authorization" | "provider" {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "provider";
  }
  const body = value as Record<string, unknown>;
  const error = body.error;
  if (typeof error === "string" && AUTHORIZATION_ERROR_CODES.has(error.toLowerCase())) {
    return "authorization";
  }
  if (!error || typeof error !== "object" || Array.isArray(error)) {
    return "provider";
  }
  const envelope = error as Record<string, unknown>;
  if (envelope.code === 190) return "authorization";
  if (
    typeof envelope.code === "string" &&
    AUTHORIZATION_ERROR_CODES.has(envelope.code.toLowerCase())
  ) {
    return "authorization";
  }
  return "provider";
}

async function providerResponse(
  provider: string,
  operation: string,
  url: string | URL,
  init: RequestInit,
  fetchImpl: ProviderFetch = fetch
): Promise<Response> {
  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort();
  if (upstreamSignal) {
    if (upstreamSignal.aborted) controller.abort();
    else upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
  }
  try {
    response = await fetchImpl(url, { ...init, signal: controller.signal });
  } catch {
    throw new IntegrationProviderError(provider, operation);
  } finally {
    clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
  if (!response.ok) {
    let kind: "authorization" | "provider" =
      response.status === 401 ? "authorization" : "provider";
    try {
      if (providerErrorKind(await response.json()) === "authorization") {
        kind = "authorization";
      }
    } catch {
      // Provider bodies are untrusted and never forwarded to callers.
    }
    throw new IntegrationProviderError(provider, operation, response.status, kind);
  }
  return response;
}

export async function providerJson<T>(
  provider: string,
  operation: string,
  url: string | URL,
  init: RequestInit,
  fetchImpl: ProviderFetch = fetch
): Promise<T> {
  const response = await providerResponse(
    provider,
    operation,
    url,
    init,
    fetchImpl
  );
  try {
    return (await response.json()) as T;
  } catch {
    throw new IntegrationProviderError(provider, operation, response.status);
  }
}

export async function providerEmpty(
  provider: string,
  operation: string,
  url: string | URL,
  init: RequestInit,
  fetchImpl: ProviderFetch = fetch
) {
  await providerResponse(provider, operation, url, init, fetchImpl);
}

export function parseGrantedScopes(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,]+/)
      : [];
  return [...new Set(values.filter((scope): scope is string => typeof scope === "string" && scope.length > 0))];
}

export function nullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function safeHttpUrl(value: unknown): string | null {
  const candidate = nullableString(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function expiresAt(now: Date, seconds: unknown) {
  const numeric = nullableNumber(seconds);
  return numeric === null
    ? null
    : new Date(now.getTime() + numeric * 1000).toISOString();
}

export function emptyOwnedPostMetrics() {
  return {
    views: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    reach: null,
    watchTimeMinutes: null,
  };
}
