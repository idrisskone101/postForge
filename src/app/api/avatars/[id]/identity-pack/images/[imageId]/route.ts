import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId } = await params;
    const image = await prisma.avatarIdentityImage.findUnique({
      where: { id: imageId },
      include: { pack: true },
    });

    if (!image || image.pack.avatarId !== id) {
      return NextResponse.json({ error: "Identity image not found" }, { status: 404 });
    }

    let data: Buffer;
    try {
      data = await storage.read(image.localPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return NextResponse.json({ error: "Identity image not found on disk" }, { status: 404 });
      }
      throw err;
    }

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve identity image:", error);
    return NextResponse.json({ error: "Failed to serve identity image" }, { status: 500 });
  }
}
