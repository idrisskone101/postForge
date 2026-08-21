import { NextResponse } from "next/server";
import {
  IntegrationDisconnectError,
  IntegrationMutationSupersededError,
  IntegrationNotConfiguredError,
  IntegrationNotConnectedError,
  IntegrationSyncError,
  YouTubePolicyConsentRequiredError,
} from "./integrations/service";
import { OAuthStateError } from "./integrations/state";
import { UnresolvedPublicationConflictError } from "./publication-lifecycle";

export function integrationJsonError(error: unknown) {
  let response: NextResponse;
  if (error instanceof IntegrationNotConfiguredError) {
    response = NextResponse.json(
      { error: "Integration is not configured" },
      { status: 503 }
    );
  } else if (error instanceof IntegrationNotConnectedError) {
    response = NextResponse.json(
      { error: "Integration is not connected" },
      { status: 409 }
    );
  } else if (error instanceof IntegrationSyncError) {
    response = NextResponse.json(
      { error: "Integration sync failed" },
      { status: 502 }
    );
  } else if (error instanceof IntegrationDisconnectError) {
    response = NextResponse.json(
      {
        error:
          "Provider revocation failed; the connection was kept so you can retry",
      },
      { status: 502 }
    );
  } else if (error instanceof YouTubePolicyConsentRequiredError) {
    response = NextResponse.json(
      { error: error.message },
      { status: 428 }
    );
  } else if (error instanceof IntegrationMutationSupersededError) {
    response = NextResponse.json(
      { error: "A newer integration change superseded this request" },
      { status: 409 }
    );
  } else if (error instanceof UnresolvedPublicationConflictError) {
    response = NextResponse.json({ error: error.message }, { status: 409 });
  } else if (error instanceof OAuthStateError) {
    response = NextResponse.json(
      { error: "OAuth state is invalid" },
      { status: 400 }
    );
  } else {
    response = NextResponse.json(
      { error: "Integration request failed" },
      { status: 500 }
    );
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function noStoreJson(value: unknown, init?: { status?: number }) {
  const response = NextResponse.json(value, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function effectiveRequestHost(request: Request) {
  const headerHost = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  if (headerHost) return headerHost;
  try {
    return new URL(request.url).host.toLowerCase();
  } catch {
    return null;
  }
}

export function isSameOriginMutation(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }

  const host = effectiveRequestHost(request);
  return host !== null && host === originHost;
}
