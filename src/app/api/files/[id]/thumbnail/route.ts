import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/db";
import { fileThumbnailWidth } from "@/lib/file-thumbnail";
import { storage } from "@/lib/storage";

/**
 * Read-only resized variant of a stored image. Any failure is a 404 so the
 * caller falls back to the original at `/api/files/[id]`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const width = fileThumbnailWidth(Number(request.nextUrl.searchParams.get("w")));

  try {
    const file = await prisma.generatedFile.findUnique({
      where: { id },
      select: { localPath: true, mimeType: true },
    });
    if (!file || !RESIZABLE_TYPES.has(file.mimeType)) return unavailable();

    // A stored file never changes under its id, so the variant is immutable too.
    const etag = `"${id}-${width}"`;
    const headers = {
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    };
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers });
    }

    const thumbnail = await sharp(await storage.read(file.localPath))
      .rotate()
      .resize({ width, height: width, fit: "outside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return new Response(new Uint8Array(thumbnail), {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "image/webp",
        "Content-Length": String(thumbnail.length),
      },
    });
  } catch (error) {
    console.error(
      "Failed to resize stored file:",
      error instanceof Error ? error.name : "UnknownError"
    );
    return unavailable();
  }
}

function unavailable() {
  return NextResponse.json(
    { error: "Thumbnail unavailable" },
    { status: 404, headers: { "Cache-Control": "no-store" } }
  );
}

/** Still images only: an animated source would lose its motion. */
const RESIZABLE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);
