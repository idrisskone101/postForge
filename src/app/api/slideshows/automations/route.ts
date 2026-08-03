import { NextRequest, NextResponse } from "next/server";
import { paginationFrom, readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  createSlideshowAutomation,
  listSlideshowAutomations,
} from "@/lib/slideshow/service";

export async function GET(request: NextRequest) {
  try {
    const result = await listSlideshowAutomations({
      ...paginationFrom(request),
      status: request.nextUrl.searchParams.get("status"),
      projectId: request.nextUrl.searchParams.get("projectId"),
    });
    return NextResponse.json(result);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to list slideshow automations");
  }
}
export async function POST(request: NextRequest) {
  try {
    const automation = await createSlideshowAutomation(
      await readJsonRequest(request)
    );
    return NextResponse.json(automation, { status: 201 });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to create slideshow automation");
  }
}
