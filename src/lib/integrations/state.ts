import {
  createHash,
  createHmac,
  randomBytes as nodeRandomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { IntegrationProvider } from "./types";

const STATE_LIFETIME_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  version: 1;
  provider: IntegrationProvider;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
};

export type CreatedOAuthState = {
  state: string;
  cookieValue: string;
  nonceHash: string;
  record: {
    version: 1;
    provider: IntegrationProvider;
    expiresAt: string;
  };
};

export class OAuthStateError extends Error {
  constructor(message = "OAuth state is invalid or expired") {
    super(message);
    this.name = "OAuthStateError";
  }
}

function sign(encodedPayload: string, signingKey: Buffer) {
  return createHmac("sha256", signingKey)
    .update(encodedPayload)
    .digest("base64url");
}

function equalStrings(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function oauthStateNonceHash(nonce: string) {
  return createHash("sha256").update(nonce).digest("hex");
}

export function createOAuthState(
  provider: IntegrationProvider,
  signingKey: Buffer,
  options: {
    now?: Date;
    randomBytes?: (size: number) => Buffer;
  } = {}
): CreatedOAuthState {
  const now = options.now ?? new Date();
  const randomBytes = options.randomBytes ?? nodeRandomBytes;
  const nonce = randomBytes(24).toString("base64url");
  const payload: OAuthStatePayload = {
    version: 1,
    provider,
    nonce,
    issuedAt: now.getTime(),
    expiresAt: now.getTime() + STATE_LIFETIME_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const state = `${encodedPayload}.${sign(encodedPayload, signingKey)}`;

  return {
    state,
    cookieValue: state,
    nonceHash: oauthStateNonceHash(nonce),
    record: {
      version: 1,
      provider,
      expiresAt: new Date(payload.expiresAt).toISOString(),
    },
  };
}

export function verifyOAuthState({
  provider,
  state,
  cookieValue,
  signingKey,
  now = new Date(),
}: {
  provider: IntegrationProvider;
  state: string | null;
  cookieValue: string | null;
  signingKey: Buffer;
  now?: Date;
}) {
  if (!state || !cookieValue || !equalStrings(state, cookieValue)) {
    throw new OAuthStateError();
  }
  const [encodedPayload, suppliedSignature, extra] = state.split(".");
  if (!encodedPayload || !suppliedSignature || extra) {
    throw new OAuthStateError();
  }
  const expectedSignature = sign(encodedPayload, signingKey);
  if (!equalStrings(suppliedSignature, expectedSignature)) {
    throw new OAuthStateError();
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as OAuthStatePayload;
  } catch {
    throw new OAuthStateError();
  }
  if (
    payload.version !== 1 ||
    payload.provider !== provider ||
    typeof payload.nonce !== "string" ||
    typeof payload.issuedAt !== "number" ||
    typeof payload.expiresAt !== "number" ||
    payload.issuedAt > now.getTime() + 30_000 ||
    payload.expiresAt < now.getTime()
  ) {
    throw new OAuthStateError();
  }

  return {
    provider: payload.provider,
    nonceHash: oauthStateNonceHash(payload.nonce),
    expiresAt: new Date(payload.expiresAt).toISOString(),
  };
}

export function oauthStateCookieName(provider: IntegrationProvider) {
  return `postforge_oauth_state_${provider}`;
}

export const OAUTH_STATE_COOKIE_MAX_AGE_SECONDS =
  STATE_LIFETIME_MS / 1000;
