import { NextRequest, NextResponse } from "next/server";
import { trimVideo } from "@/lib/ugc/trim-video";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { localPath, startTime, endTime } = body;

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
    return NextResponse.json(result);
  } catch (error) {
    console.error("Trim video error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trim video" },
      { status: 500 }
    );
  }
}
