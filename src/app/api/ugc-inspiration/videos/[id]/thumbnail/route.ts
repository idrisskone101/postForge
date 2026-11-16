import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveTikTokThumbnailWithYtDlp } from "@/lib/inspiration/fresh-thumbnail";

const REQUEST_TIMEOUT_MS = 10_000;
const IMAGE_ACCEPT_HEADER =
  "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";
const TIKTOK_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function isLikelyImageUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  if (/\.(avif|webp|png|jpe?g|gif)(\?|$)/i.test(normalized)) return true;
  if (normalized.includes("tiktokcdn")) return true;
  return normalized.includes("thumbnail");
}

function collectUrlLikes(
  value: unknown,
  urls: Set<string>,
  depth = 0
): void {
  if (depth > 5) return;

  if (typeof value === "string") {
    const candidate = readHttpUrl(value);
    if (candidate && isLikelyImageUrl(candidate)) {
      urls.add(candidate);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectUrlLikes(item, urls, depth + 1);
    }
    return;
  }

  if (!isRecord(value)) return;
  for (const nested of Object.values(value)) {
    collectUrlLikes(nested, urls, depth + 1);
  }
}

function collectPayloadThumbnailCandidates(payload: unknown): string[] {
  if (!isRecord(payload)) return [];

  const candidates = new Set<string>();
  const directFields = [
    payload.thumbnail_url,
    payload.thumbnail,
    payload.cover_url,
    payload.cover,
    payload.coverUrl,
    payload.dynamic_cover,
    payload.dynamicCover,
    payload.origin_cover,
    payload.originCover,
  ];

  for (const value of directFields) {
    const url = readHttpUrl(value);
    if (url) {
      candidates.add(url);
    }
  }

  collectUrlLikes(payload, candidates);
  return [...candidates];
}

interface ImageFetchResult {
  bytes: ArrayBuffer;
  contentType: string;
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

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength) return null;

    return { bytes: arrayBuffer, contentType };
  } catch {
    return null;
  }
}

function getOEmbedUrl(postUrl: string): string {
  return `https://www.tiktok.com/oembed?url=${encodeURIComponent(postUrl)}`;
}

async function resolveFreshThumbnailUrl(postUrl: string): Promise<string | null> {
  try {
    const response = await fetch(getOEmbedUrl(postUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        "User-Agent": TIKTOK_USER_AGENT,
      },
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    if (!isRecord(payload)) return null;
    return readHttpUrl(payload.thumbnail_url);
  } catch {
    return null;
  }
}

const refreshing = new Set<string>();

function refreshThumbnailInBackground(videoId: string, postUrl: string, attempted: Set<string>) {
  if (refreshing.has(videoId)) return;
  refreshing.add(videoId);
  void (async () => {
    try {
      const freshUrl =
        (await resolveFreshThumbnailUrl(postUrl)) ?? (await resolveTikTokThumbnailWithYtDlp(postUrl));
      if (!freshUrl || attempted.has(freshUrl)) return;
      if (!(await fetchImageBytes(freshUrl))) return;
      await prisma.inspirationVideo.update({ where: { id: videoId }, data: { thumbnailUrl: freshUrl } });
    } catch (error) {
      console.error("Failed to refresh inspiration thumbnail:", error);
    } finally {
      refreshing.delete(videoId);
    }
  })();
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
    const video = await prisma.inspirationVideo.findUnique({
      where: { id },
      select: {
        id: true,
        thumbnailUrl: true,
        originalUrl: true,
        sourcePayload: true,
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Inspiration video not found" }, { status: 404 });
    }

    const attempted = new Set<string>();
    const candidates = [
      video.thumbnailUrl,
      ...collectPayloadThumbnailCandidates(video.sourcePayload),
    ];

    for (const candidate of candidates) {
      const url = readHttpUrl(candidate);
      if (!url || attempted.has(url)) continue;
      attempted.add(url);

      const image = await fetchImageBytes(url);
      if (image) {
        return imageResponse(image);
      }
    }

    // An expired cover is refreshed in the background. Waiting for it here would hold one of the
    // browser's few connections to the app for seconds, which stalls navigation; the tile retries.
    refreshThumbnailInBackground(video.id, video.originalUrl, attempted);
    return NextResponse.json(
      { error: "Thumbnail unavailable" },
      { status: 404, headers: { "Retry-After": "5", "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to serve inspiration thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to serve inspiration thumbnail" },
      { status: 500 }
    );
  }
}
