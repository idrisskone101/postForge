import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  deleteSlideshowProject,
  getSlideshowProject,
  updateSlideshowProject,
} from "@/lib/slideshow/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    return NextResponse.json(await getSlideshowProject(id));
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to fetch slideshow");
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const project = await updateSlideshowProject(id, await readJsonRequest(request));
    return NextResponse.json(project);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to update slideshow");
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    await deleteSlideshowProject(id, await readJsonRequest(request));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to delete slideshow");
  }
}
