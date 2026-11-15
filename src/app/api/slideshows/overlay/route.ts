import { NextRequest } from "next/server";

import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import { parseSlideshowOverlayRequest } from "@/lib/slideshow/overlay-request";
import { SLIDESHOW_OVERLAY_BOXES_HEADER } from "@/lib/slideshow/text-overlay";
import { createSlideshowTextOverlay } from "@/lib/slideshow/text-overlay-satori";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { slide, width, height, settings } = parseSlideshowOverlayRequest(
      await readJsonRequest(request),
    );
    const overlay = await createSlideshowTextOverlay(
      slide,
      width,
      height,
      settings,
    );
    return new Response(overlay.markup, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
        [SLIDESHOW_OVERLAY_BOXES_HEADER]: JSON.stringify(overlay.boxes),
      },
    });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to render slideshow overlay");
  }
}
