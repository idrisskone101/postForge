import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lookupTikTokCreator } from "@/lib/inspiration/virlo";

const REQUEST_TIMEOUT_MS = 10_000;
const AVATAR_RECOVERY_RETRY_MS = 15 * 60 * 1000;
const IMAGE_ACCEPT_HEADER =
  "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";
const HTML_ACCEPT_HEADER =
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const TIKTOK_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

interface ImageFetchResult {
  bytes: ArrayBuffer;
  contentType: string;
}

const avatarRecoveryAttempts = new Map<string, number>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&#x2F;/gi, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readMetaImageUrl(html: string): string | null {
  const metaPattern =
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/gi;
  const contentPattern = /\bcontent=["']([^"']+)["']/i;

  for (const match of html.matchAll(metaPattern)) {
    const content = match[0].match(contentPattern)?.[1];
    const url = readHttpUrl(content ? decodeHtmlEntities(content) : null);
    if (url) return url;
  }

  return null;
}

function findAvatarUrlLikeString(value: unknown, keyHint = ""): string | null {
  const normalizedKey = keyHint.toLowerCase().replace(/[^a-z0-9]/g, "");
  const keyLooksLikeAvatar =
    normalizedKey.includes("avatar") ||
    normalizedKey.includes("profilepic") ||
    normalizedKey.includes("profileimage") ||
    normalizedKey.includes("headshot");

  if (typeof value === "string") {
    const url = readHttpUrl(value);
    return keyLooksLikeAvatar ? url : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findAvatarUrlLikeString(item, keyHint);
      if (match) return match;
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const [key, nested] of Object.entries(value)) {
    const match = findAvatarUrlLikeString(nested, key);
    if (match) return match;
  }

  return null;
}

function readScriptJson(html: string, scriptId: string): unknown | null {
  const pattern = new RegExp(
    `<script[^>]+id=["']${scriptId}["'][^>]*>([\\s\\S]*?)<\\/script>`,
    "i"
  );
  const rawJson = html.match(pattern)?.[1];
  if (!rawJson) return null;

  try {
    return JSON.parse(decodeHtmlEntities(rawJson));
  } catch {
    return null;
  }
}

function isBrowserPreviewImage(contentType: string): boolean {
  return /^(image\/(avif|bmp|gif|jpeg|jpg|png|svg\+xml|webp))$/i.test(
    contentType
  );
}

async function fetchImageBytes(url: string): Promise<ImageFetchResult | null> {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: IMAGE_ACCEPT_HEADER,
        "User-Agent": TIKTOK_USER_AGENT,
      },
    });

    if (!response.ok) return null;

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!isBrowserPreviewImage(contentType)) return null;

    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength) return null;

    return { bytes, contentType };
  } catch {
    return null;
  }
}

async function fetchTikTokProfileAvatarUrl(
  profileUrl: string | null
): Promise<string | null> {
  if (!profileUrl) return null;

  try {
    const response = await fetch(profileUrl, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: HTML_ACCEPT_HEADER,
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": TIKTOK_USER_AGENT,
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const metaImageUrl = readMetaImageUrl(html);
    if (metaImageUrl) return metaImageUrl;

    const rehydrationData = readScriptJson(
      html,
      "__UNIVERSAL_DATA_FOR_REHYDRATION__"
    );
    return findAvatarUrlLikeString(rehydrationData);
  } catch {
    return null;
  }
}

async function fetchVirloAvatarUrl(handle: string): Promise<string | null> {
  try {
    const result = await lookupTikTokCreator(handle, 1);
    return findAvatarUrlLikeString(result);
  } catch {
    return null;
  }
}

function imageResponse(result: ImageFetchResult): NextResponse {
  return new NextResponse(result.bytes, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await prisma.inspirationAccount.findUnique({
      where: { id },
      select: {
        avatarUrl: true,
        handleNormalized: true,
        profileUrl: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Inspiration account not found" },
        { status: 404 }
      );
    }

    const avatarUrl = readHttpUrl(account.avatarUrl);
    if (avatarUrl) {
      const image = await fetchImageBytes(avatarUrl);
      if (image) {
        return imageResponse(image);
      }
    }

    const lastRecoveryAttempt = avatarRecoveryAttempts.get(id) ?? 0;
    if (Date.now() - lastRecoveryAttempt < AVATAR_RECOVERY_RETRY_MS) {
      return NextResponse.json({ error: "Avatar unavailable" }, { status: 404 });
    }
    avatarRecoveryAttempts.set(id, Date.now());

    const recoveredAvatarUrls = new Set<string>();
    const profileAvatarUrl = readHttpUrl(
      await fetchTikTokProfileAvatarUrl(account.profileUrl)
    );
    if (profileAvatarUrl && profileAvatarUrl !== avatarUrl) {
      recoveredAvatarUrls.add(profileAvatarUrl);
    }

    for (const recoveredAvatarUrl of recoveredAvatarUrls) {
      const image = await fetchImageBytes(recoveredAvatarUrl);
      if (!image) continue;

      await prisma.$executeRaw`
        UPDATE "InspirationAccount"
        SET "avatarUrl" = ${recoveredAvatarUrl}
        WHERE "id" = ${id}
      `;

      return imageResponse(image);
    }

    const virloAvatarUrl = readHttpUrl(
      await fetchVirloAvatarUrl(account.handleNormalized)
    );
    if (virloAvatarUrl && virloAvatarUrl !== avatarUrl) {
      const image = await fetchImageBytes(virloAvatarUrl);
      if (image) {
        await prisma.$executeRaw`
          UPDATE "InspirationAccount"
          SET "avatarUrl" = ${virloAvatarUrl}
          WHERE "id" = ${id}
        `;

        return imageResponse(image);
      }
    }

    return NextResponse.json({ error: "Avatar unavailable" }, { status: 404 });
  } catch (error) {
    console.error("Failed to serve inspiration avatar:", error);
    return NextResponse.json(
      { error: "Failed to serve inspiration avatar" },
      { status: 500 }
    );
  }
}
