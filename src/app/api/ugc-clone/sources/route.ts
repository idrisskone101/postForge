import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export async function GET() {
  try {
    const sources = await prisma.tikTokSource.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        originalUrl: true,
        localPath: true,
        filename: true,
        durationSec: true,
        width: true,
        height: true,
        fileSizeBytes: true,
        thumbnailPath: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const existingSources = (
      await Promise.all(
        sources.map(async (source) => ({
          ...source,
          exists: source.localPath ? await storage.exists(source.localPath) : false,
        }))
      )
    )
      .filter((source) => source.exists)
      .map((source) => {
        const { exists, ...rest } = source;
        void exists;
        return rest;
      });

    return NextResponse.json(existingSources);
  } catch (error) {
    console.error("Failed to list TikTok sources:", error);
    return NextResponse.json(
      { error: "Failed to list sources" },
      { status: 500 }
    );
  }
}
