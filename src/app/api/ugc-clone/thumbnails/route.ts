import { NextRequest, NextResponse } from "next/server";
import { generateThumbnails } from "@/lib/ugc/trim-video";
import { isStoragePathUnder } from "@/lib/storage";

const SOURCE_VIDEO_PATH_PREFIXES = ["tiktok-sources", "ugc-clone-sources"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const localPath = searchParams.get("path");
    const countParam = searchParams.get("count");

    if (!localPath) {
      return NextResponse.json(
        { error: "path query parameter is required" },
        { status: 400 }
      );
    }

    if (!isStoragePathUnder(localPath, SOURCE_VIDEO_PATH_PREFIXES)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }

    const count = countParam ? parseInt(countParam, 10) : 8;

    if (isNaN(count) || count < 1 || count > 20) {
      return NextResponse.json(
        { error: "count must be between 1 and 20" },
        { status: 400 }
      );
    }

    const thumbnails = await generateThumbnails(localPath, count);
    return NextResponse.json({ thumbnails });
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate thumbnails" },
      { status: 500 }
    );
  }
}
