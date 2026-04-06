import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    return NextResponse.json(sources);
  } catch (error) {
    console.error("Failed to list TikTok sources:", error);
    return NextResponse.json(
      { error: "Failed to list sources" },
      { status: 500 }
    );
  }
}
