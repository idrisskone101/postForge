import { NextRequest, NextResponse } from "next/server";
import { generateThumbnails } from "@/lib/ugc/trim-video";
import { isStoragePathUnder } from "@/lib/storage";

const SOURCE_VIDEO_PATH_PREFIXES = ["tiktok-sources", "ugc-clone-sources"];
const MAX_THUMBNAIL_COUNT = 4;
const MAX_THUMBNAIL_CACHE_ENTRIES = 50;

const thumbnailCache = new Map<string, Promise<string[]>>();

function trimThumbnailCache() {
  while (thumbnailCache.size > MAX_THUMBNAIL_CACHE_ENTRIES) {
    const oldestKey = thumbnailCache.keys().next().value;
    if (!oldestKey) return;
    thumbnailCache.delete(oldestKey);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const localPath = searchParams.get("path");
    const countParam = searchParams.get("count");

    if (!localPath) {
      return NextResponse.json(
        { error: "path query parameter is required" },
        { status: 400 }
      );
    }

    if (!isStoragePathUnder(localPath, SOURCE_VIDEO_PATH_PREFIXES)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }

    const requestedCount = countParam ? parseInt(countParam, 10) : MAX_THUMBNAIL_COUNT;

    if (isNaN(requestedCount) || requestedCount < 1 || requestedCount > 20) {
      return NextResponse.json(
        { error: "count must be between 1 and 20" },
        { status: 400 }
      );
    }

    const count = Math.min(requestedCount, MAX_THUMBNAIL_COUNT);
    const cacheKey = `${localPath}:${count}`;
    let thumbnailPromise = thumbnailCache.get(cacheKey);

    if (!thumbnailPromise) {
      thumbnailPromise = generateThumbnails(localPath, count);
      thumbnailCache.set(cacheKey, thumbnailPromise);
      trimThumbnailCache();
      thumbnailPromise.catch(() => thumbnailCache.delete(cacheKey));
    }

    const thumbnails = await thumbnailPromise;
    return NextResponse.json(
      { thumbnails },
      { headers: { "Cache-Control": "private, max-age=3600" } }
    );
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate thumbnails" },
      { status: 500 }
    );
  }
}
