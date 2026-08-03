import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isStoragePathUnder, storage } from "@/lib/storage";
import { slideshowErrorResponse } from "@/lib/slideshow/http";

type Context = {
  params: Promise<{ collectionId: string; imageId: string }>;
};

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { collectionId, imageId } = await params;
    const image = await prisma.slideshowImage.findFirst({
      where: { id: imageId, collectionId },
      select: { localPath: true, mimeType: true, fileSizeBytes: true },
    });
    if (
      !image?.localPath ||
      !isStoragePathUnder(image.localPath, ["slideshow-images"])
    ) {
      return NextResponse.json({ error: "Image file not found" }, { status: 404 });
    }

    const data = await storage.read(image.localPath);
    if (!data.length) {
      return NextResponse.json({ error: "Image file is empty" }, { status: 404 });
    }
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType ?? "application/octet-stream",
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to serve slideshow image");
  }
}
