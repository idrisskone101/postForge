import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }

    const candidateLimit = Math.min(limit * 3, 300);

    const files = await prisma.generatedFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: candidateLimit,
      select: {
        id: true,
        filename: true,
        type: true,
        mimeType: true,
        width: true,
        height: true,
        createdAt: true,
        localPath: true,
      },
    });

    const existingFiles = (
      await Promise.all(
        files.map(async (file) => ({
          ...file,
          exists: file.localPath ? await storage.exists(file.localPath) : false,
        }))
      )
    )
      .filter((file) => file.exists)
      .slice(0, limit)
      .map((file) => ({
        id: file.id,
        filename: file.filename,
        type: file.type,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        createdAt: file.createdAt,
      }));

    return NextResponse.json(existingFiles);
  } catch (error) {
    console.error("Failed to list files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
