import { NextRequest, NextResponse } from "next/server";

const AUTH_CHALLENGE = 'Basic realm="postForge"';

function readBasicPassword(authHeader: string): string | null {
  const encoded = authHeader.slice("Basic ".length).trim();
  if (!encoded) return null;

  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");
    return separatorIndex >= 0
      ? decoded.slice(separatorIndex + 1)
      : decoded;
  } catch {
    return null;
  }
}

function readAuthToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  if (authHeader.startsWith("Basic ")) {
    return readBasicPassword(authHeader);
  }

  return authHeader.trim();
}

function equalTokens(left: string | null, right: string) {
  if (left === null) return false;
  const maximumLength = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < maximumLength; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function unauthorized() {
  return NextResponse.json(
    { error: "Missing or invalid Authorization header" },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": AUTH_CHALLENGE,
        "Cache-Control": "no-store",
      },
    }
  );
}

function authenticationNotConfigured() {
  return NextResponse.json(
    { error: "POSTFORGE_API_KEY is required for a non-local production deployment" },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}

export function middleware(request: NextRequest) {
  // Railway health checks cannot send the operator API key. Keep this endpoint
  // narrow and independently limited to a minimal database-readiness response.
  if (request.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  // Provider crawlers cannot send the operator API key. This one media route
  // is independently protected by a short-lived, asset/provider-bound HMAC
  // and still verifies that the asset is an approved generated video.
  if (
    request.nextUrl.pathname.startsWith(
      "/api/integrations/publish-media/"
    ) ||
    // Vercel Cron cannot send the operator key. Both cron routes perform
    // their own fail-closed CRON_SECRET bearer validation.
    request.nextUrl.pathname === "/api/integrations/retention" ||
    request.nextUrl.pathname === "/api/internal/slideshow-automations/tick"
  ) {
    return NextResponse.next();
  }

  const apiKey = process.env.POSTFORGE_API_KEY;

  // Local development and local production QA remain frictionless. A deployed
  // production host must opt into the explicit single-operator auth boundary.
  if (!apiKey) {
    const hostname = request.nextUrl.hostname;
    const isLocalhost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1";
    return process.env.NODE_ENV !== "production" || isLocalhost
      ? NextResponse.next()
      : authenticationNotConfigured();
  }

  const token = readAuthToken(request.headers.get("authorization"));
  if (!equalTokens(token, apiKey)) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
