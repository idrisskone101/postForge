import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/generate-image";
import { generateAvatarImage } from "@/lib/ugc/generate-avatar-image";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import { getDefaultModel } from "@/lib/ai/model-availability";
import type { ImageGenerationRequest } from "@/lib/ai/types";
import {
  parseReferenceFileIds,
  resolveGeneratedImageReferences,
} from "@/lib/ai/generated-file-references";
import {
  CollectionAssetRequestError,
  parseCollectionAssetIds,
  resolveCollectionImageReferences,
} from "@/lib/collection-assets-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const collectionAssetIds = parseCollectionAssetIds(body.collectionAssetIds);

    // Validate required fields
    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required and must be a string" },
        { status: 400 }
      );
    }

    // Avatar-driven generation: render an image from an AI avatar using its
    // identity references (same identity-locking approach as the Clone tab).
    if (body.avatarId !== undefined && body.avatarId !== null) {
      if (typeof body.avatarId !== "string") {
        return NextResponse.json(
          { error: "avatarId must be a string" },
          { status: 400 }
        );
      }

      if (collectionAssetIds.length > 0) {
        return NextResponse.json(
          {
            error:
              "Collection references cannot be combined with character identity yet. Choose one reference source.",
          },
          { status: 400 }
        );
      }

      if (
        body.hairstyleRole !== undefined &&
        body.hairstyleRole !== null &&
        typeof body.hairstyleRole !== "string"
      ) {
        return NextResponse.json(
          { error: "hairstyleRole must be a string" },
          { status: 400 }
        );
      }

      const { jobId, estimatedCost, model } = await generateAvatarImage({
        avatarId: body.avatarId,
        prompt: body.prompt,
        imageModel: body.model,
        aspectRatio: body.aspectRatio,
        numImages: body.numImages,
        negativePrompt: body.negativePrompt,
        hairstyleRole: body.hairstyleRole ?? null,
      });

      return NextResponse.json(
        {
          id: jobId,
          status: "queued",
          model,
          estimatedCost,
          createdAt: new Date().toISOString(),
        },
        { status: 202 }
      );
    }

    const model = body.model ?? (await getDefaultModel("image"));

    // Validate model exists and is an image model
    const modelDef = getModel(model);
    if (!modelDef) {
      return NextResponse.json(
        { error: `Unknown model: ${model}` },
        { status: 400 }
      );
    }
    if (modelDef.type !== "image") {
      return NextResponse.json(
        { error: `Model ${model} is not an image model` },
        { status: 400 }
      );
    }

    const ownedReferenceIds = parseReferenceFileIds(body.referenceFileIds);
    const maximumReferences = modelDef.capabilities.maxReferenceImages ?? 0;
    if (ownedReferenceIds.length + collectionAssetIds.length > maximumReferences) {
      return NextResponse.json(
        { error: `This model accepts up to ${maximumReferences} reference images` },
        { status: 400 }
      );
    }
    const [ownedReferenceUrls, collectionReferenceUrls] = await Promise.all([
      resolveGeneratedImageReferences(ownedReferenceIds),
      resolveCollectionImageReferences(collectionAssetIds),
    ]);
    const requestedReferenceUrls = body.referenceImageUrls ?? body.imageUrls;
    if (
      requestedReferenceUrls !== undefined &&
      (!Array.isArray(requestedReferenceUrls) ||
        !requestedReferenceUrls.every((url: unknown) => typeof url === "string"))
    ) {
      return NextResponse.json(
        { error: "referenceImageUrls must be an array of URLs" },
        { status: 400 }
      );
    }

    const editEndpoint =
      body.editEndpoint === true ||
      ownedReferenceIds.length > 0 ||
      collectionAssetIds.length > 0;
    if (editEndpoint && !modelDef.capabilities.referenceImages) {
      return NextResponse.json(
        { error: `Model ${model} does not support reference-image editing` },
        { status: 400 }
      );
    }

    const genRequest: ImageGenerationRequest = {
      prompt: body.prompt,
      model,
      aspectRatio: body.aspectRatio,
      numImages: body.numImages,
      negativePrompt: body.negativePrompt,
      imageUrls: [
        ...ownedReferenceUrls,
        ...collectionReferenceUrls,
        ...(requestedReferenceUrls ?? []),
      ],
      editEndpoint,
      enableWebSearch: body.enableWebSearch,
    };

    const estimatedCost = calculateEstimatedCost(model, {
      numImages: body.numImages ?? modelDef.defaults.numImages ?? 1,
    });

    const jobId = await generateImage(genRequest, undefined, {
      jobInput: {
        prompt: body.prompt,
        model,
        aspectRatio: body.aspectRatio,
        numImages: body.numImages,
        negativePrompt: body.negativePrompt,
        referenceFileIds: ownedReferenceIds,
        collectionAssetIds,
        referenceImageUrls:
          ownedReferenceIds.length > 0 ? undefined : requestedReferenceUrls,
        editEndpoint,
        enableWebSearch: body.enableWebSearch,
        characterPreview: body.characterPreview === true || undefined,
        characterRecipeFingerprint:
          body.characterPreview === true &&
          typeof body.characterRecipeFingerprint === "string"
            ? body.characterRecipeFingerprint
            : undefined,
      },
      jobTags: body.characterPreview === true ? ["character-preview"] : undefined,
    });

    return NextResponse.json(
      {
        id: jobId,
        status: "queued",
        model,
        estimatedCost,
        createdAt: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof CollectionAssetRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit image generation" },
      { status: 500 }
    );
  }
}
