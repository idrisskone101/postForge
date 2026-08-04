import { NextRequest, NextResponse } from "next/server";
import { paginationFrom, readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  createSlideshowImageCollection,
  listSlideshowImageCollections,
} from "@/lib/slideshow/service";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      await listSlideshowImageCollections(paginationFrom(request))
    );
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to list slideshow image collections");
  }
}
export async function POST(request: NextRequest) {
  try {
    const collection = await createSlideshowImageCollection(
      await readJsonRequest(request)
    );
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to create slideshow image collection");
  }
}
