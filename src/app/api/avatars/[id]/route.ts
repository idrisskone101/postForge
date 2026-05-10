import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const avatar = await prisma.avatar.findUnique({ where: { id } });
    if (!avatar) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    const exists = await storage.exists(avatar.localPath);
    if (!exists) {
      return NextResponse.json({ error: "Avatar file not found on disk" }, { status: 404 });
    }

    const data = await storage.read(avatar.localPath);

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": avatar.mimeType,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve avatar:", error);
    return NextResponse.json({ error: "Failed to serve avatar" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [avatar, references, identityImages] = await Promise.all([
      prisma.avatar.findUnique({ where: { id } }),
      prisma.ugcReferenceImage.findMany({
        where: { avatarId: id },
        select: { localPath: true },
      }),
      prisma.avatarIdentityImage.findMany({
        where: { pack: { avatarId: id } },
        select: { localPath: true },
      }),
    ]);

    if (!avatar) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    await Promise.all([
      storage.delete(avatar.localPath),
      ...references.map((reference) => storage.delete(reference.localPath)),
      ...identityImages.map((image) => storage.delete(image.localPath)),
    ]);
    await prisma.avatar.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete avatar:", error);
    return NextResponse.json({ error: "Failed to delete avatar" }, { status: 500 });
  }
}
