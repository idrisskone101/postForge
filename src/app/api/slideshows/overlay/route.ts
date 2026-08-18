import { NextRequest } from "next/server";

import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import { parseSlideshowOverlayRequest } from "@/lib/slideshow/overlay-request";
import { createSlideshowTextOverlayMarkup } from "@/lib/slideshow/text-overlay-satori";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { slide, width, height, settings } = parseSlideshowOverlayRequest(
      await readJsonRequest(request),
    );
    const svg = await createSlideshowTextOverlayMarkup(
      slide,
      width,
      height,
      settings,
    );
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to render slideshow overlay");
  }
}
