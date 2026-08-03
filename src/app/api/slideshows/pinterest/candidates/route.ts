import { NextRequest, NextResponse } from "next/server";

import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import { findPinterestCandidates } from "@/lib/slideshow/pinterest";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(
      await findPinterestCandidates(await readJsonRequest(request)),
    );
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to import Pinterest images");
  }
}
