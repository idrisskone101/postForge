import { NextRequest, NextResponse } from "next/server";
import {
  getIntegrationPublicUrl,
  isIntegrationProvider,
} from "@/lib/integrations/config";
import {
  completeOAuthConnection,
  consumeProviderOAuthState,
  IntegrationNotConfiguredError,
} from "@/lib/integrations/service";
import { noStoreJson } from "@/lib/integrations/routes";
import { OAuthStateError, oauthStateCookieName } from "@/lib/integrations/state";
import type { IntegrationProvider } from "@/lib/integrations/types";
import { UnresolvedPublicationConflictError } from "@/lib/publication-lifecycle";

type CallbackResult =
  | { connected: true }
  | {
      connected: false;
      integrationError:
        | "oauth_denied"
        | "state_invalid"
        | "exchange_failed"
        | "not_configured"
        | "publication_unresolved";
    };

function settingsRedirect(
  request: NextRequest,
  provider: string,
  result: CallbackResult
) {
  const baseUrl = getIntegrationPublicUrl() || request.nextUrl.origin;
  const url = new URL("/settings", baseUrl);
  url.searchParams.set("tab", "integrations");
  url.searchParams.set("provider", provider);
  if (result.connected) url.searchParams.set("connected", "1");
  else url.searchParams.set("integration_error", result.integrationError);
  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function clearStateCookie(
  response: NextResponse,
  provider: IntegrationProvider,
  request: NextRequest
) {
  const publicUrl = getIntegrationPublicUrl();
  response.cookies.set(oauthStateCookieName(provider), "", {
    httpOnly: true,
    sameSite: "lax",
    secure:
      request.nextUrl.protocol === "https:" ||
      publicUrl.startsWith("https://"),
    maxAge: 0,
    path: `/api/integrations/${provider}/callback`,
  });
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await params;
  if (!isIntegrationProvider(rawProvider)) {
    return noStoreJson(
      { error: "Unknown integration provider" },
      { status: 404 }
    );
  }

  const state = request.nextUrl.searchParams.get("state");
  const cookieValue =
    request.cookies.get(oauthStateCookieName(rawProvider))?.value ?? null;
  try {
    const consumedOAuthState = await consumeProviderOAuthState(
      rawProvider,
      state,
      cookieValue
    );
    if (request.nextUrl.searchParams.has("error")) {
      return clearStateCookie(
        settingsRedirect(request, rawProvider, {
          connected: false,
          integrationError: "oauth_denied",
        }),
        rawProvider,
        request
      );
    }
    const code = request.nextUrl.searchParams.get("code");
    if (!code) throw new Error("Authorization code is missing");
    await completeOAuthConnection(rawProvider, code, { consumedOAuthState });
    return clearStateCookie(
      settingsRedirect(request, rawProvider, { connected: true }),
      rawProvider,
      request
    );
  } catch (error) {
    const integrationError =
      error instanceof UnresolvedPublicationConflictError
        ? "publication_unresolved"
        : error instanceof IntegrationNotConfiguredError
          ? "not_configured"
        : error instanceof OAuthStateError ||
            (error instanceof Error && error.message.includes("OAuth state"))
          ? "state_invalid"
          : "exchange_failed";
    console.error(
      `Failed to finish ${rawProvider} OAuth:`,
      error instanceof Error ? error.name : "UnknownError"
    );
    return clearStateCookie(
      settingsRedirect(request, rawProvider, {
        connected: false,
        integrationError,
      }),
      rawProvider,
      request
    );
  }
}
