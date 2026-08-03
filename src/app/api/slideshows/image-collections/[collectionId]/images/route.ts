import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import { addSlideshowImages } from "@/lib/slideshow/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collectionId: string }> }
) {
  try {
    const { collectionId } = await params;
    const collection = await addSlideshowImages(
      collectionId,
      await readJsonRequest(request)
    );
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to add slideshow images");
  }
}
