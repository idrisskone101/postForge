import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = await prisma.generatedFile.findUnique({
    where: { id },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      type: true,
      width: true,
      height: true,
      durationSec: true,
      fileSizeBytes: true,
      localPath: true,
      createdAt: true,
    },
  });
  if (!file || !(await storage.exists(file.localPath))) {
    return NextResponse.json({ error: "Generated file not found" }, { status: 404 });
  }
  return NextResponse.json({
    file: {
      id: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      type: file.type,
      width: file.width,
      height: file.height,
      durationSec: file.durationSec,
      fileSizeBytes: file.fileSizeBytes,
      createdAt: file.createdAt.toISOString(),
      previewUrl: `/api/files/${file.id}`,
    },
  });
}
