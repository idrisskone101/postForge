import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get("path");
    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { error: "path query parameter is required" },
        { status: 400 }
      );
    }

    // Security: only allow tiktok-sources paths
    if (!path.startsWith("tiktok-sources/")) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 403 }
      );
    }

    const exists = await storage.exists(path);
    if (!exists) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const buffer = await storage.read(path);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Video preview error:", error);
    return NextResponse.json(
      { error: "Failed to serve video" },
      { status: 500 }
    );
  }
}
