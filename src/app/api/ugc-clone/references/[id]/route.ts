import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reference = await prisma.ugcReferenceImage.findUnique({
      where: { id },
    });

    if (!reference) {
      return NextResponse.json(
        { error: "Saved reference not found" },
        { status: 404 }
      );
    }

    let data: Buffer;
    try {
      data = await storage.read(reference.localPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return NextResponse.json(
          { error: "Saved reference asset not found" },
          { status: 404 }
        );
      }
      throw error;
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Saved reference has no media data" },
        { status: 404 }
      );
    }

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": reference.mimeType,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve saved reference:", error);
    return NextResponse.json(
      { error: "Failed to serve saved reference" },
      { status: 500 }
    );
  }
}
