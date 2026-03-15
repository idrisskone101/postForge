import { NextRequest, NextResponse } from "next/server";
import { trimVideo } from "@/lib/ugc/trim-video";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { extractThumbnailToDisk } from "@/lib/ugc/thumbnail";
import * as path from "path";

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

    if (endTime > 30) {
      return NextResponse.json(
        { error: "endTime must be <= 30 seconds" },
        { status: 400 }
      );
    }

    // Prevent path traversal
    if (localPath.includes("..")) {
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
      const trimmedFullPath = storage.getFullPath(result.localPath);
      const dir = path.dirname(trimmedFullPath);
      const thumbnailPath = await extractThumbnailToDisk(trimmedFullPath, dir);

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
