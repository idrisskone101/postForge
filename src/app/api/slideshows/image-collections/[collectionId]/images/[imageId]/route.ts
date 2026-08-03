import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  deleteSlideshowImage,
  getSlideshowImage,
  updateSlideshowImage,
} from "@/lib/slideshow/service";

type Context = {
  params: Promise<{ collectionId: string; imageId: string }>;
};

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { collectionId, imageId } = await params;
    return NextResponse.json(await getSlideshowImage(collectionId, imageId));
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to fetch slideshow image");
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { collectionId, imageId } = await params;
    const collection = await updateSlideshowImage(
      collectionId,
      imageId,
      await readJsonRequest(request)
    );
    return NextResponse.json(collection);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to update slideshow image");
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { collectionId, imageId } = await params;
    const collection = await deleteSlideshowImage(
      collectionId,
      imageId,
      await readJsonRequest(request)
    );
    return NextResponse.json(collection);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to delete slideshow image");
  }
}
