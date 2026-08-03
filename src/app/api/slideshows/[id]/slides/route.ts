import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  addSlideshowSlide,
  listSlideshowSlides,
} from "@/lib/slideshow/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json(await listSlideshowSlides(id));
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to list slideshow slides");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await addSlideshowSlide(id, await readJsonRequest(request));
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to add slideshow slide");
  }
}
