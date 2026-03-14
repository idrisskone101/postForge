import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import * as fs from "fs/promises";

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

    const fullPath = storage.getFullPath(path);
    const exists = await storage.exists(path);
    if (!exists) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const stat = await fs.stat(fullPath);
    const buffer = await fs.readFile(fullPath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": stat.size.toString(),
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
