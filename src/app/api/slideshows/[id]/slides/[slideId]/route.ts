import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  deleteSlideshowSlide,
  getSlideshowSlide,
  updateSlideshowSlide,
} from "@/lib/slideshow/service";

type Context = { params: Promise<{ id: string; slideId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { id, slideId } = await params;
    return NextResponse.json(await getSlideshowSlide(id, slideId));
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to fetch slideshow slide");
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { id, slideId } = await params;
    const project = await updateSlideshowSlide(
      id,
      slideId,
      await readJsonRequest(request)
    );
    return NextResponse.json(project);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to update slideshow slide");
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { id, slideId } = await params;
    const project = await deleteSlideshowSlide(
      id,
      slideId,
      await readJsonRequest(request)
    );
    return NextResponse.json(project);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to delete slideshow slide");
  }
}
