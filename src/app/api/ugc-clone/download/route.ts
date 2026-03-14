import { NextRequest, NextResponse } from "next/server";
import { downloadTikTok } from "@/lib/ugc/download-tiktok";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    const result = await downloadTikTok(body.url);

    return NextResponse.json(result);
  } catch (error) {
    console.error("TikTok download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download TikTok video" },
      { status: 500 }
    );
  }
}
