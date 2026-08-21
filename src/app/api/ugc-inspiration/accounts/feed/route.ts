import { NextRequest, NextResponse } from "next/server";
import { listInspirationVideos, parseInspirationVideoPageQuery } from "@/lib/inspiration/video-page";
import { VirloApiError } from "@/lib/inspiration/virlo";

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof VirloApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const page = await listInspirationVideos(
      parseInspirationVideoPageQuery(request.nextUrl.searchParams)
    );
    return NextResponse.json(page);
  } catch (error) {
    console.error("Failed to list inspiration videos:", error);
    return errorResponse(error, "Failed to list inspiration videos.");
  }
}
