import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  deleteSlideshowImageCollection,
  getSlideshowImageCollection,
  updateSlideshowImageCollection,
} from "@/lib/slideshow/service";

type Context = { params: Promise<{ collectionId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { collectionId } = await params;
    return NextResponse.json(await getSlideshowImageCollection(collectionId));
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to fetch slideshow image collection");
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { collectionId } = await params;
    const collection = await updateSlideshowImageCollection(
      collectionId,
      await readJsonRequest(request)
    );
    return NextResponse.json(collection);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to update slideshow image collection");
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { collectionId } = await params;
    await deleteSlideshowImageCollection(
      collectionId,
      await readJsonRequest(request)
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to delete slideshow image collection");
  }
}
