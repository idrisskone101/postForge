import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const avatarId = request.nextUrl.searchParams.get("avatarId");

    if (!avatarId) {
      return NextResponse.json(
        { error: "avatarId is required" },
        { status: 400 }
      );
    }

    const references = await prisma.ugcReferenceImage.findMany({
      where: { avatarId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        avatarId: true,
        prompt: true,
        createdAt: true,
        filename: true,
        mimeType: true,
        width: true,
        height: true,
        fileSizeBytes: true,
        tikTokSource: {
          select: {
            id: true,
            label: true,
            originalUrl: true,
          },
        },
      },
    });

    return NextResponse.json(
      references.map((reference) => ({
        id: reference.id,
        avatarId: reference.avatarId,
        prompt: reference.prompt,
        createdAt: reference.createdAt,
        filename: reference.filename,
        mimeType: reference.mimeType,
        width: reference.width,
        height: reference.height,
        fileSizeBytes: reference.fileSizeBytes,
        previewUrl: `/api/ugc-clone/references/${reference.id}`,
        source: reference.tikTokSource,
      }))
    );
  } catch (error) {
    console.error("Failed to list UGC reference images:", error);
    return NextResponse.json(
      { error: "Failed to list saved references" },
      { status: 500 }
    );
  }
}
