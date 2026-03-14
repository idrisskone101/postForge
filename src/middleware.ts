import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const apiKey = process.env.POSTFORGE_API_KEY;

  // If no API key is configured, bypass auth entirely (dev convenience)
  if (!apiKey) {
    return NextResponse.next();
  }

  // Allow same-origin browser requests (app UI calling its own API)
  const referer = request.headers.get("referer");
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.origin === requestUrl.origin) {
        return NextResponse.next();
      }
    } catch {
      // Invalid referer URL, fall through to auth check
    }
  }

  if (origin) {
    if (origin === requestUrl.origin) {
      return NextResponse.next();
    }
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Missing Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (token !== apiKey) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
