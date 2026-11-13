import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { CHARACTER_PORTRAIT_WIDTHS } from "../portrait-url";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ avatarId: string }> }
) {
  const { avatarId } = await params;
  const requested = Number(request.nextUrl.searchParams.get("w"));
  const width = CHARACTER_PORTRAIT_WIDTHS.find((candidate) => candidate >= requested)
    ?? CHARACTER_PORTRAIT_WIDTHS[CHARACTER_PORTRAIT_WIDTHS.length - 1];

  const avatar = await prisma.avatar.findUnique({
    where: { id: avatarId },
    select: { localPath: true, updatedAt: true },
  });
  if (!avatar || !(await storage.exists(avatar.localPath))) {
    return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
  }

  const etag = `"${avatarId}-${avatar.updatedAt.getTime()}-${width}"`;
  const headers = {
    "Cache-Control": "private, max-age=0, must-revalidate",
    ETag: etag,
  };
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  try {
    const source = await storage.read(avatar.localPath);
    const portrait = await sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return new Response(new Uint8Array(portrait), {
      status: 200,
      headers: { ...headers, "Content-Type": "image/webp", "Content-Length": String(portrait.length) },
    });
  } catch (error) {
    console.error("Failed to resize character portrait:", error);
    return NextResponse.json({ error: "Portrait could not be resized" }, { status: 500 });
  }
}
