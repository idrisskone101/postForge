import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import { duplicateSlideshowProject } from "@/lib/slideshow/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await duplicateSlideshowProject(
      id,
      await readJsonRequest(request)
    );
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to duplicate slideshow");
  }
}
