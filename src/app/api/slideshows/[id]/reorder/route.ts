import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import { reorderSlideshowSlides } from "@/lib/slideshow/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await reorderSlideshowSlides(
      id,
      await readJsonRequest(request)
    );
    return NextResponse.json(project);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to reorder slideshow slides");
  }
}
