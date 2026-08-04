import { createHmac, timingSafeEqual } from "node:crypto";
import type { IntegrationProvider } from "./types";

const SIGNED_MEDIA_LIFETIME_SECONDS = 2 * 60 * 60;

function signingPayload(input: {
  assetId: string;
  provider: IntegrationProvider;
  expires: number;
}) {
  return [
    "postforge-publish-media-v1",
    input.provider,
    input.assetId,
    String(input.expires),
  ].join("\n");
}

function signature(
  input: { assetId: string; provider: IntegrationProvider; expires: number },
  key: Buffer
) {
  return createHmac("sha256", key)
    .update(signingPayload(input))
    .digest("base64url");
}

export function createSignedPublishMediaUrl(input: {
  publicUrl: string;
  assetId: string;
  provider: IntegrationProvider;
  encryptionKey: Buffer;
  now?: Date;
}) {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(input.assetId)) {
    throw new Error("Publish media asset id is invalid");
  }
  const origin = new URL(input.publicUrl);
  const hostname = origin.hostname.toLowerCase();
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local")
  ) {
    throw new Error("A public HTTPS PostForge URL is required");
  }
  const expires = Math.floor(
    ((input.now ?? new Date()).getTime() + SIGNED_MEDIA_LIFETIME_SECONDS * 1000) /
      1000
  );
  const url = new URL(
    `/api/integrations/publish-media/${encodeURIComponent(input.assetId)}`,
    origin.origin
  );
  url.searchParams.set("provider", input.provider);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set(
    "signature",
    signature(
      {
        assetId: input.assetId,
        provider: input.provider,
        expires,
      },
      input.encryptionKey
    )
  );
  return url.toString();
}

export function verifySignedPublishMediaRequest(input: {
  assetId: string;
  provider: IntegrationProvider;
  expires: number;
  providedSignature: string;
  encryptionKey: Buffer;
  now?: Date;
}) {
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (
    !Number.isSafeInteger(input.expires) ||
    input.expires <= nowSeconds ||
    input.expires > nowSeconds + SIGNED_MEDIA_LIFETIME_SECONDS
  ) {
    return false;
  }
  const expected = Buffer.from(
    signature(
      {
        assetId: input.assetId,
        provider: input.provider,
        expires: input.expires,
      },
      input.encryptionKey
    ),
    "utf8"
  );
  const provided = Buffer.from(input.providedSignature, "utf8");
  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}
