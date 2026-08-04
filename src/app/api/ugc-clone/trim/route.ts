import { NextRequest, NextResponse } from "next/server";
import { trimVideo } from "@/lib/ugc/trim-video";
import { prisma } from "@/lib/db";
import { isStoragePathUnder, storage } from "@/lib/storage";
import { extractThumbnail } from "@/lib/ugc/thumbnail";
import { MAX_MOTION_SOURCE_DURATION_SEC } from "@/lib/ugc/source-limits";

const SOURCE_VIDEO_PATH_PREFIXES = ["tiktok-sources", "ugc-clone-sources"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { localPath, startTime, endTime, sourceId } = body;

    if (!localPath || typeof localPath !== "string") {
      return NextResponse.json(
        { error: "localPath is required and must be a string" },
        { status: 400 }
      );
    }

    if (typeof startTime !== "number" || typeof endTime !== "number") {
      return NextResponse.json(
        { error: "startTime and endTime are required and must be numbers" },
        { status: 400 }
      );
    }

    if (startTime < 0) {
      return NextResponse.json(
        { error: "startTime must be >= 0" },
        { status: 400 }
      );
    }

    if (endTime <= startTime) {
      return NextResponse.json(
        { error: "endTime must be greater than startTime" },
        { status: 400 }
      );
    }

    if (endTime - startTime > MAX_MOTION_SOURCE_DURATION_SEC) {
      return NextResponse.json(
        { error: `Trim duration must be <= ${MAX_MOTION_SOURCE_DURATION_SEC} seconds` },
        { status: 400 }
      );
    }

    if (!isStoragePathUnder(localPath, SOURCE_VIDEO_PATH_PREFIXES)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }

    const result = await trimVideo(localPath, startTime, endTime);

    // If sourceId is provided, update the TikTokSource DB record
    // so the trimmed video becomes the saved source
    if (sourceId && typeof sourceId === "string") {
      // Generate a new thumbnail from the trimmed video
      const trimmedFullPath = await storage.ensureLocalFile(result.localPath);
      const thumbnailPath = await extractThumbnail(trimmedFullPath);

      const updateData: Record<string, unknown> = {
        localPath: result.localPath,
        filename: result.filename,
        durationSec: result.durationSec,
        width: result.width,
        height: result.height,
      };
      if (thumbnailPath) {
        updateData.thumbnailPath = thumbnailPath;
      }

      const updated = await prisma.tikTokSource.update({
        where: { id: sourceId },
        data: updateData,
      });

      return NextResponse.json({
        ...result,
        source: updated,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Trim video error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trim video" },
      { status: 500 }
    );
  }
}
