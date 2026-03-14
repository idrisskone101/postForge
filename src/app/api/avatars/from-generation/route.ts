import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.fileId || typeof body.fileId !== "string") {
      return NextResponse.json(
        { error: "fileId is required" },
        { status: 400 }
      );
    }

    const name = body.name || "Generated Avatar";

    // Find the generated file
    const file = await prisma.generatedFile.findUnique({
      where: { id: body.fileId },
    });

    if (!file) {
      return NextResponse.json(
        { error: "Generated file not found" },
        { status: 404 }
      );
    }

    if (!file.mimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Copy the file to avatars storage
    const data = await storage.read(file.localPath);
    const ext = file.filename.split(".").pop() || "png";
    const filename = `${randomUUID()}.${ext}`;
    const localPath = await storage.save("avatars", filename, data);

    const avatar = await prisma.avatar.create({
      data: {
        name,
        localPath,
        filename,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        fileSizeBytes: file.fileSizeBytes,
      },
    });

    return NextResponse.json(avatar, { status: 201 });
  } catch (error) {
    console.error("Failed to create avatar from generation:", error);
    return NextResponse.json(
      { error: "Failed to create avatar from generation" },
      { status: 500 }
    );
  }
}
