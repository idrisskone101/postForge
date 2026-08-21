import { NextRequest, NextResponse } from "next/server";
import {
  getIntegrationPublicUrl,
  isIntegrationProvider,
} from "@/lib/integrations/config";
import {
  integrationJsonError,
  isSameOriginMutation,
  noStoreJson,
} from "@/lib/http";
import { rejectCrossOriginMutation } from "@/lib/integrations/routes";
import { beginOAuthConnection } from "@/lib/integrations/service";
import {
  oauthStateCookieName,
  OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/integrations/state";

function setOAuthStateCookie(
  request: NextRequest,
  response: NextResponse,
  provider: "tiktok" | "instagram" | "youtube",
  cookieValue: string
) {
  response.cookies.set(oauthStateCookieName(provider), cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      request.nextUrl.protocol === "https:" ||
      getIntegrationPublicUrl().startsWith("https://"),
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_SECONDS,
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
  try {
    const result = await beginOAuthConnection(rawProvider);
    const response = NextResponse.redirect(result.authorizationUrl, 302);
    response.headers.set("Cache-Control", "no-store");
    return setOAuthStateCookie(
      request,
      response,
      rawProvider,
      result.state.cookieValue
    );
  } catch (error) {
    console.error(
      `Failed to start ${rawProvider} OAuth:`,
      error instanceof Error ? error.name : "UnknownError"
    );
    return integrationJsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();
  const { provider: rawProvider } = await params;
  if (!isIntegrationProvider(rawProvider)) {
    return noStoreJson(
      { error: "Unknown integration provider" },
      { status: 404 }
    );
  }
  try {
    const body = (await request.json().catch(() => null)) as {
      acceptPolicies?: unknown;
    } | null;
    const result = await beginOAuthConnection(rawProvider, {
      youtubePolicyConsent: body?.acceptPolicies === true,
    });
    return setOAuthStateCookie(
      request,
      noStoreJson({ authorizationUrl: result.authorizationUrl }),
      rawProvider,
      result.state.cookieValue
    );
  } catch (error) {
    console.error(
      `Failed to start ${rawProvider} OAuth:`,
      error instanceof Error ? error.name : "UnknownError"
    );
    return integrationJsonError(error);
  }
}
