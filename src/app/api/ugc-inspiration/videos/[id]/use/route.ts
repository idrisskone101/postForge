import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { type UseInspirationResult } from "@/lib/inspiration/types";
import { ensureTikTokSource } from "@/lib/ugc/ensure-tiktok-source";
import { VirloApiError } from "@/lib/inspiration/virlo";

function errorResponse(error: unknown, fallback: string) {
  const status = error instanceof VirloApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const video = await prisma.inspirationVideo.findUnique({
      where: { id },
      select: { id: true, originalUrl: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Inspiration video not found" }, { status: 404 });
    }

    const source = await ensureTikTokSource(video.originalUrl);
    const result: UseInspirationResult = {
      sourceId: source.id,
      redirectTo: `/ugc-clone?sourceId=${source.id}`,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to use inspiration video:", error);
    return errorResponse(error, "Failed to use inspiration video.");
  }
}
