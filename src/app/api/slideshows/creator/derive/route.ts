import { NextRequest, NextResponse } from "next/server";

import { deriveTemplateFromReferences } from "@/lib/ai/slideshow-creator";
import {
  CollectionAssetRequestError,
  parseCollectionAssetIds,
  resolveCollectionImageReferences,
} from "@/lib/collection-assets-server";

/**
 * POST /api/slideshows/creator/derive
 *
 * Derive a Slideshow Creator aesthetic JSON template from reference images.
 * Reference images may be raw https URLs or PostForge Collection assets.
 * Requires a configured Gemini credential (vision). Never falls back to a
 * generic template — if the vision credential is missing, the caller sees an
 * explicit error so no synthetic/demo direction is ever produced.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }
    const record = body as Record<string, unknown>;

    let collectionAssetIds: string[] = [];
    try {
      collectionAssetIds = parseCollectionAssetIds(record.collectionAssetIds);
    } catch (error) {
      if (error instanceof CollectionAssetRequestError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const rawUrls = record.referenceImageUrls ?? record.imageUrls;
    if (
      rawUrls !== undefined &&
      (!Array.isArray(rawUrls) ||
        !rawUrls.every((value) => typeof value === "string"))
    ) {
      return NextResponse.json(
        { error: "referenceImageUrls must be an array of URLs" },
        { status: 400 }
      );
    }
    const requestedUrls = (rawUrls as string[] | undefined) ?? [];

    const collectionUrls = collectionAssetIds.length
      ? await resolveCollectionImageReferences(collectionAssetIds)
      : [];

    const referenceUrls = [...collectionUrls, ...requestedUrls];
    if (!referenceUrls.length) {
      return NextResponse.json(
        {
          error:
            "Provide at least one reference image (upload or Collection asset) to derive a visual template.",
        },
        { status: 400 }
      );
    }

    const result = await deriveTemplateFromReferences(referenceUrls);
    return NextResponse.json({
      template: result.template,
      model: result.model,
      referenceCount: result.referenceCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to derive visual template";
    const status =
      error instanceof Error &&
      /Gemini|template|reference|credential|API key/i.test(message)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
