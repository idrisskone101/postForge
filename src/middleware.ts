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

function unauthorized() {
  return NextResponse.json(
    { error: "Missing or invalid Authorization header" },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": AUTH_CHALLENGE,
      },
    }
  );
}

export function middleware(request: NextRequest) {
  const apiKey = process.env.POSTFORGE_API_KEY;

  // If no API key is configured, bypass auth entirely (dev convenience)
  if (!apiKey) {
    return NextResponse.next();
  }

  const token = readAuthToken(request.headers.get("authorization"));
  if (token !== apiKey) {
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
