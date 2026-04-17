import { NextRequest, NextResponse } from "next/server";
import { validateTikTokUrl } from "@/lib/ugc/download-tiktok";
import { ensureTikTokSource } from "@/lib/ugc/ensure-tiktok-source";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    const url = body.url.trim();
    validateTikTokUrl(url);
    const source = await ensureTikTokSource(url);

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("TikTok download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download TikTok video" },
      { status: 500 }
    );
  }
}
