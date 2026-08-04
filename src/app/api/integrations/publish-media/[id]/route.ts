import { prisma } from "@/lib/db";
import { getIntegrationEncryptionKey } from "@/lib/integrations/crypto";
import { isIntegrationProvider } from "@/lib/integrations/config";
import { verifySignedPublishMediaRequest } from "@/lib/integrations/publish-media";
import {
  IntegrationMediaValidationError,
  assertSocialPublishMediaSizeBytes,
} from "@/lib/integrations/publishing";
import { storage } from "@/lib/storage";

function forbidden() {
  return Response.json(
    { error: "Signed media request is invalid or expired" },
    { status: 403, headers: { "Cache-Control": "no-store" } }
  );
}

function byteRange(value: string | null, size: number) {
  if (!value) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(value.trim());
  if (!match) return undefined;
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  const end = Math.min(requestedEnd, size - 1);
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start > end ||
    start >= size
  ) {
    return undefined;
  }
  return { start, end };
}

async function serve(
  request: Request,
  params: Promise<{ id: string }>,
  includeBody: boolean
) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) return forbidden();
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? "";
  const expires = Number(url.searchParams.get("expires"));
  const providedSignature = url.searchParams.get("signature") ?? "";
  if (!isIntegrationProvider(provider)) return forbidden();
  let encryptionKey: Buffer;
  try {
    encryptionKey = getIntegrationEncryptionKey();
  } catch {
    return forbidden();
  }
  if (
    !verifySignedPublishMediaRequest({
      assetId: id,
      provider,
      expires,
      providedSignature,
      encryptionKey,
    })
  ) {
    return forbidden();
  }

  const file = await prisma.generatedFile.findUnique({
    where: { id },
    select: {
      type: true,
      mimeType: true,
      localPath: true,
      reviewStatus: true,
      fileSizeBytes: true,
    },
  });
  if (
    !file ||
    file.type !== "video" ||
    !file.mimeType.startsWith("video/") ||
    file.reviewStatus !== "approved_output"
  ) {
    return forbidden();
  }
  let size: number;
  try {
    if (file.fileSizeBytes !== null) {
      assertSocialPublishMediaSizeBytes(file.fileSizeBytes);
    }
    size = await storage.size(file.localPath);
    assertSocialPublishMediaSizeBytes(size);
    if (file.fileSizeBytes !== null && file.fileSizeBytes !== size) {
      return new Response(null, {
        status: 409,
        headers: { "Cache-Control": "no-store" },
      });
    }
  } catch (cause) {
    if (cause instanceof IntegrationMediaValidationError) {
      return new Response(null, {
        status: 413,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const range = byteRange(request.headers.get("range"), size);
  if (range === undefined) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
        "Cache-Control": "no-store",
      },
    });
  }
  const contentLength = range ? range.end - range.start + 1 : size;
  let body: Buffer | null = null;
  if (includeBody) {
    try {
      body = range
        ? await storage.readRange(file.localPath, range.start, range.end)
        : await storage.read(file.localPath);
    } catch {
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (body.length !== contentLength) {
      return new Response(null, {
        status: 409,
        headers: { "Cache-Control": "no-store" },
      });
    }
  }
  return new Response(body ? new Uint8Array(body) : null, {
    status: range ? 206 : 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(contentLength),
      "Accept-Ranges": "bytes",
      ...(range
        ? { "Content-Range": `bytes ${range.start}-${range.end}/${size}` }
        : {}),
      // The query string is a bearer capability. Never let an intermediary
      // retain media after the HMAC has expired (or replay it from cache).
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return serve(request, params, true);
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return serve(request, params, false);
}
