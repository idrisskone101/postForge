import { NextRequest, NextResponse } from "next/server";
import { paginationFrom, readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  createSlideshowProject,
  listSlideshowProjects,
} from "@/lib/slideshow/service";

export async function GET(request: NextRequest) {
  try {
    const pagination = paginationFrom(request);
    const result = await listSlideshowProjects({
      ...pagination,
      status: request.nextUrl.searchParams.get("status"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to list slideshows");
  }
}
export async function POST(request: NextRequest) {
  try {
    const project = await createSlideshowProject(await readJsonRequest(request));
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to create slideshow");
  }
}
