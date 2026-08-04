import { NextRequest, NextResponse } from "next/server";
import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  deleteSlideshowAutomation,
  getSlideshowAutomation,
  updateSlideshowAutomation,
} from "@/lib/slideshow/service";

type Context = { params: Promise<{ automationId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { automationId } = await params;
    return NextResponse.json(await getSlideshowAutomation(automationId));
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to fetch slideshow automation");
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { automationId } = await params;
    const automation = await updateSlideshowAutomation(
      automationId,
      await readJsonRequest(request)
    );
    return NextResponse.json(automation);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to update slideshow automation");
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const { automationId } = await params;
    await deleteSlideshowAutomation(
      automationId,
      await readJsonRequest(request)
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to delete slideshow automation");
  }
}
