import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const avatars = await prisma.avatar.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        localPath: true,
        filename: true,
        mimeType: true,
        width: true,
        height: true,
        fileSizeBytes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(avatars);
  } catch (error) {
    console.error("Failed to list avatars:", error);
    return NextResponse.json(
      { error: "Failed to list avatars" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || "Untitled Avatar";

    if (!file) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    // Validate mime type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "png";
    const filename = `${randomUUID()}.${ext}`;
    const localPath = await storage.save("avatars", filename, buffer);

    const avatar = await prisma.avatar.create({
      data: {
        name,
        localPath,
        filename,
        mimeType: file.type,
        fileSizeBytes: buffer.length,
      },
    });

    return NextResponse.json(avatar, { status: 201 });
  } catch (error) {
    console.error("Failed to upload avatar:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
