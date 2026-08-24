import {
  SOCIAL_PROVIDERS,
  type SocialProvider,
} from "@/lib/integrations-client";

const INTEGRATION_CALLBACK_KEYS = [
  "integration",
  "provider",
  "integration_status",
  "status",
  "connected",
  "integration_error",
  "error",
  "error_description",
  "message",
] as const;

export function readIntegrationCallbackFeedback(params: URLSearchParams): {
  tone: "success" | "error";
  message: string;
  provider: SocialProvider | null;
} | null {
  const connectedValue = params.get("connected");
  const providerValue =
    params.get("provider") ??
    params.get("integration") ??
    (connectedValue && SOCIAL_PROVIDERS.includes(connectedValue as SocialProvider)
      ? connectedValue
      : null);
  const provider = SOCIAL_PROVIDERS.includes(providerValue as SocialProvider)
    ? (providerValue as SocialProvider)
    : null;
  const displayName = provider
    ? provider === "youtube"
      ? "YouTube"
      : provider === "tiktok"
        ? "TikTok"
        : "Instagram"
    : "Social account";
  const failure =
    params.get("integration_error") ??
    params.get("error_description") ??
    params.get("error");
  if (failure) {
    const failureMessages: Record<string, string> = {
      oauth_denied: "authorization was denied",
      state_invalid: "the OAuth security check expired or was invalid",
      exchange_failed: "the provider token exchange failed",
      not_configured: "the server integration is not configured",
      publication_unresolved:
        "the new authorization would strand a pending publication; reconnect the same account with publishing permission or finish the publication first",
    };
    return {
      tone: "error",
      message: `${displayName} connection failed: ${failureMessages[failure] ?? "an unknown connection error occurred"}`,
      provider,
    };
  }

  const outcome = (
    params.get("integration_status") ??
    params.get("status") ??
    connectedValue ??
    ""
  ).toLowerCase();
  if (
    provider &&
    (["1", "connected", "success", "complete", "true"].includes(outcome) ||
      provider === connectedValue)
  ) {
    return {
      tone: "success",
      message: `${displayName} authorization returned. Confirming the server connection.`,
      provider,
    };
  }
  if (["error", "failed", "denied", "cancelled"].includes(outcome)) {
    return {
      tone: "error",
      message: `${displayName} connection was not completed.`,
      provider,
    };
  }
  return null;
}

export function removeIntegrationCallbackParams(params: URLSearchParams) {
  for (const key of INTEGRATION_CALLBACK_KEYS) params.delete(key);
}
