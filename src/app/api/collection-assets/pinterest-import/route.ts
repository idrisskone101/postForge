import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { readJsonRequest, slideshowErrorResponse } from "@/lib/slideshow/http";
import { SlideshowApiError } from "@/lib/slideshow/errors";
import { downloadPinterestImage, assertPinImageUrl } from "@/lib/pinterest-import";
import { storage } from "@/lib/storage";
import type { CollectionAssetRecord, CollectionRecord } from "@/lib/collections";
import { transactWorkspaceFeatureRecords } from "@/lib/workspace-feature-store";

export const runtime = "nodejs";

const MAX_IMPORT_IMAGES = 40;

export async function POST(request: NextRequest) {
  try {
    const body = (await readJsonRequest(request)) as {
      urls?: unknown;
      name?: unknown;
    };
    if (!Array.isArray(body.urls) || body.urls.length === 0) {
      throw new SlideshowApiError(
        400,
        "invalid_request",
        "urls must be a non-empty array of Pinterest image URLs",
      );
    }
    if (body.urls.length > MAX_IMPORT_IMAGES) {
      throw new SlideshowApiError(
        400,
        "invalid_request",
        `A single import accepts at most ${MAX_IMPORT_IMAGES} images`,
      );
    }
    const collectionName =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 160)
        : "Pinterest import";
    const urls = body.urls.map(assertPinImageUrl);

    const importedAssets: CollectionAssetRecord[] = [];
    const skipped: Array<{ url: string; reason: string }> = [];
    for (const url of urls) {
      try {
        const { buffer, contentType } = await downloadPinterestImage(url);
        const id = randomUUID();
        const extension = contentType.includes("png")
          ? "png"
          : contentType.includes("webp")
            ? "webp"
            : "jpg";
        const filename = `${id}.${extension}`;
        const localPath = await storage.save("collection-assets", filename, buffer);
        importedAssets.push({
          id,
          kind: "asset",
          name: `pinterest-${importedAssets.length + 1}.${extension}`,
          filename,
          mimeType: contentType,
          fileSizeBytes: buffer.length,
          localPath,
          createdAt: new Date().toISOString(),
        });
      } catch (downloadError) {
        skipped.push({
          url,
          reason:
            downloadError instanceof Error
              ? downloadError.message
              : "The image could not be downloaded",
        });
      }
    }

    if (!importedAssets.length) {
      throw new SlideshowApiError(
        502,
        "import_failed",
        "None of the selected Pinterest images could be downloaded",
        { skipped },
      );
    }

    const now = new Date().toISOString();
    const collection: CollectionRecord = {
      id: `collection_${Date.now()}_${randomUUID().slice(0, 8)}`,
      kind: "collection",
      name: collectionName,
      assetIds: importedAssets.map((asset) => asset.id),
      createdAt: now,
      updatedAt: now,
    };

    const records = await transactWorkspaceFeatureRecords(
      "collections",
      async (current) => {
        const next = [...current, ...importedAssets, collection];
        return { records: next, result: next };
      },
    );

    return NextResponse.json(
      {
        collection,
        imported: importedAssets.length,
        skipped,
        records,
      },
      { status: 201 },
    );
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to import Pinterest images");
  }
}
