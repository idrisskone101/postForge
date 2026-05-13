import { NextRequest, NextResponse } from "next/server";
import {
  GALLERY_PAGE_SIZE,
  getGalleryPage,
} from "@/lib/gallery";
import type { GallerySortOrder, GalleryTypeFilter } from "@/lib/gallery";

const TYPE_FILTERS = new Set(["all", "image", "video"]);
const SORT_ORDERS = new Set(["newest", "oldest"]);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get("type") ?? "all";
    const sortParam = searchParams.get("sort") ?? "newest";
    const cursor = searchParams.get("cursor");
    const limitParam = Number.parseInt(
      searchParams.get("limit") ?? String(GALLERY_PAGE_SIZE),
      10
    );

    const type = TYPE_FILTERS.has(typeParam)
      ? (typeParam as GalleryTypeFilter)
      : "all";
    const sort = SORT_ORDERS.has(sortParam)
      ? (sortParam as GallerySortOrder)
      : "newest";
    const limit = Number.isFinite(limitParam) ? limitParam : GALLERY_PAGE_SIZE;

    return NextResponse.json(
      await getGalleryPage({ cursor, limit, type, sort })
    );
  } catch (error) {
    console.error("Failed to load gallery:", error);
    return NextResponse.json(
      { error: "Failed to load gallery" },
      { status: 500 }
    );
  }
}
