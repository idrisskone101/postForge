import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { findCollectionAsset } from "@/lib/collection-assets-server";
import {
  assertAssetsAreNotPublicationLeased,
  UnresolvedPublicationConflictError,
  withLockedAutomationRecords,
} from "@/lib/publication-lifecycle";
import {
  isSameOriginMutation,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";
import { parseSingleByteRange, type ByteRange } from "@/lib/http-byte-range";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const file = await prisma.generatedFile.findUnique({
      where: { id },
    });

    const collectionAsset = file ? null : await findCollectionAsset(id);
    if (!file && !collectionAsset) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const localPath = file?.localPath ?? collectionAsset!.localPath;
    const mimeType = file?.mimeType ?? collectionAsset!.mimeType;

    let data: Buffer;
    let size: number;
    let range: ByteRange | null;
    try {
      size = await storage.size(localPath);
      range = parseSingleByteRange(request.headers.get("range"), size);
      data = range
        ? await storage.readRange(localPath, range.start, range.end)
        : await storage.read(localPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return NextResponse.json(
          { error: "File not found on disk" },
          { status: 404 }
        );
      }
      if (err instanceof RangeError) {
        const knownSize = await storage.size(localPath).catch(() => 0);
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${knownSize}` },
        });
      }
      throw err;
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "File has no stored media data" },
        { status: 404 }
      );
    }

    return new Response(new Uint8Array(data), {
      status: range ? 206 : 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(data.length),
        "Accept-Ranges": "bytes",
        ...(range
          ? { "Content-Range": `bytes ${range.start}-${range.end}/${size}` }
          : {}),
        "Cache-Control": file
          ? "public, max-age=31536000, immutable"
          : "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to serve file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();
  try {
    const { id } = await params;
    const localPath = await withLockedAutomationRecords(async (records, transaction) => {
      assertAssetsAreNotPublicationLeased(records, [id]);
      const file = await transaction.generatedFile.findUnique({ where: { id } });
      if (!file) return { result: null };
      await transaction.generatedFile.delete({ where: { id } });
      return { result: file.localPath };
    });
    if (localPath === null) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    await storage.delete(localPath);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnresolvedPublicationConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Failed to delete file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
