import { NextRequest, NextResponse } from "next/server";
import {
  deriveVibeTemplateFromDataUris,
  loadCollectionImageDataUris,
} from "@/lib/ai/collection-vibe";
import {
  CollectionAssetRequestError,
  parseCollectionAssetIds,
} from "@/lib/collection-assets-server";
import {
  isSameOriginMutation,
  rejectCrossOriginMutation,
} from "@/lib/integrations/routes";

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return rejectCrossOriginMutation();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  try {
    const collectionAssetIds = parseCollectionAssetIds(
      (body as Record<string, unknown>).collectionAssetIds
    );
    if (collectionAssetIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one collection image before extracting a vibe JSON." },
        { status: 400 }
      );
    }

    const dataUris = await loadCollectionImageDataUris(collectionAssetIds);
    const result = await deriveVibeTemplateFromDataUris(dataUris);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof CollectionAssetRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Vibe extraction failed.";
    const status = /Connect Ollama/i.test(message) ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
