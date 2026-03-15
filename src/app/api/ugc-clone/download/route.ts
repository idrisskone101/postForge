import { NextRequest, NextResponse } from "next/server";
import { downloadTikTok, validateTikTokUrl, fetchMetadata } from "@/lib/ugc/download-tiktok";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

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

    // Fetch metadata to get canonical URL for dedup
    const metadata = await fetchMetadata(url);
    const canonicalUrl = metadata.canonicalUrl;

    // Check for existing record
    const existing = await prisma.tikTokSource.findUnique({
      where: { originalUrl: canonicalUrl },
    });

    if (existing) {
      // Verify file still exists on disk
      const fileExists = await storage.exists(existing.localPath);
      if (fileExists) {
        return NextResponse.json(existing);
      }
      // Stale record — file missing, delete and re-download
      await prisma.tikTokSource.delete({ where: { id: existing.id } });
    }

    // Download the video (pass metadata to avoid duplicate yt-dlp call)
    const result = await downloadTikTok(url, metadata);

    // Persist to database
    const source = await prisma.tikTokSource.create({
      data: {
        label: result.label,
        originalUrl: result.canonicalUrl,
        localPath: result.localPath,
        filename: result.filename,
        durationSec: result.durationSec,
        width: result.width,
        height: result.height,
        fileSizeBytes: result.fileSizeBytes,
        thumbnailPath: result.thumbnailPath,
      },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("TikTok download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download TikTok video" },
      { status: 500 }
    );
  }
}
