import { createHmac, timingSafeEqual } from "node:crypto";
import { forceDeleteLocalIntegrationData } from "./service";
import { noStoreJson } from "./routes";
import { UnresolvedPublicationConflictError } from "../publication-lifecycle";

export class MetaSignedRequestError extends Error {}

type MetaSignedRequestPayload = {
  algorithm?: unknown;
  issued_at?: unknown;
  user_id?: unknown;
};

function decodeBase64UrlJson(value: string): MetaSignedRequestPayload {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as MetaSignedRequestPayload;
  } catch {
    throw new MetaSignedRequestError("Meta signed request payload is invalid");
  }
}

export function verifyMetaSignedRequest(signedRequest: string, appSecret: string) {
  const [encodedSignature, encodedPayload, extra] = signedRequest.split(".");
  if (!encodedSignature || !encodedPayload || extra !== undefined || !appSecret) {
    throw new MetaSignedRequestError("Meta signed request is invalid");
  }

  const payload = decodeBase64UrlJson(encodedPayload);
  if (String(payload.algorithm ?? "").toUpperCase() !== "HMAC-SHA256") {
    throw new MetaSignedRequestError("Meta signed request algorithm is invalid");
  }

  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    throw new MetaSignedRequestError("Meta signed request signature is invalid");
  }
  const expectedSignature = createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw new MetaSignedRequestError("Meta signed request signature is invalid");
  }

  const userId = typeof payload.user_id === "string" ? payload.user_id.trim() : "";
  if (!userId) {
    throw new MetaSignedRequestError("Meta signed request user is missing");
  }

  return {
    userId,
    issuedAt: typeof payload.issued_at === "number" ? payload.issued_at : null,
  };
}

export async function handleInstagramDeauthorize(
  request: Request,
  dependencies: {
    appSecret?: string;
    deleteAccount?: (accountId: string) => Promise<unknown>;
  } = {}
) {
  const appSecret = dependencies.appSecret ?? process.env.INSTAGRAM_CLIENT_SECRET?.trim() ?? "";
  if (!appSecret) {
    return noStoreJson(
      { error: "Instagram deauthorization is not configured" },
      { status: 503 }
    );
  }

  let signedRequest = "";
  try {
    const form = await request.formData();
    const value = form.get("signed_request");
    signedRequest = typeof value === "string" ? value : "";
  } catch {
    return noStoreJson({ error: "Invalid deauthorization request" }, { status: 400 });
  }

  try {
    const payload = verifyMetaSignedRequest(signedRequest, appSecret);
    const deleteAccount =
      dependencies.deleteAccount ??
      ((accountId: string) => forceDeleteLocalIntegrationData("instagram", accountId));
    await deleteAccount(payload.userId);
    return noStoreJson({ received: true });
  } catch (error) {
    if (error instanceof MetaSignedRequestError) {
      return noStoreJson({ error: "Invalid deauthorization request" }, { status: 400 });
    }
    if (error instanceof UnresolvedPublicationConflictError) {
      return noStoreJson(
        { error: "A provider publication is still pending" },
        { status: 409 }
      );
    }
    console.error(
      "Failed to process Instagram deauthorization:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return noStoreJson({ error: "Deauthorization could not be completed" }, { status: 500 });
  }
}
