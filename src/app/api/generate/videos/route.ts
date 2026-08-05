import { NextRequest, NextResponse } from "next/server";
import { generateVideo } from "@/lib/ai/generate-video";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import type { VideoGenerationRequest } from "@/lib/ai/types";
import {
  parseSingleVideoReferenceFileId,
  resolveVideoReferenceImage,
} from "@/lib/ai/generated-file-references";
import {
  CollectionAssetRequestError,
  parseCollectionAssetIds,
  resolveCollectionImageReferences,
} from "@/lib/collection-assets-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const collectionAssetIds = parseCollectionAssetIds(body.collectionAssetIds, 1);
    const referenceFileId = parseSingleVideoReferenceFileId(body.referenceFileId);

    // Validate required fields
    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required and must be a string" },
        { status: 400 }
      );
    }

    const model = body.model ?? "kling-3.0";

    // Validate model exists and is a video model
    const modelDef = getModel(model);
    if (!modelDef) {
      return NextResponse.json(
        { error: `Unknown model: ${model}` },
        { status: 400 }
      );
    }
    if (modelDef.type !== "video") {
      return NextResponse.json(
        { error: `Model ${model} is not a video model` },
        { status: 400 }
      );
    }

    if (referenceFileId && collectionAssetIds.length > 0) {
      return NextResponse.json(
        {
          error:
            "A video seed reference cannot be combined with a visual collection reference. Choose one.",
        },
        { status: 400 }
      );
    }

    if (collectionAssetIds.length > 0 && !modelDef.capabilities.imageToVideo) {
      return NextResponse.json(
        { error: `Model ${model} does not support a collection image reference` },
        { status: 400 }
      );
    }

    if (referenceFileId && !modelDef.capabilities.videoToVideo) {
      return NextResponse.json(
        { error: `Model ${model} does not support video seed references` },
        { status: 400 }
      );
    }

    const [collectionImageUrl, videoReferenceImageUrl] = await Promise.all([
      resolveCollectionImageReferences(collectionAssetIds),
      referenceFileId ? resolveVideoReferenceImage(referenceFileId) : Promise.resolve([]),
    ]);

    const genRequest: VideoGenerationRequest = {
      prompt: body.prompt,
      model,
      duration: body.duration,
      aspectRatio: body.aspectRatio,
      inputImageUrl:
        collectionImageUrl[0] ??
        videoReferenceImageUrl[0] ??
        body.inputImageUrl,
      enableAudio: body.enableAudio,
      multiShot: body.multiShot,
    };

    const estimatedCost = calculateEstimatedCost(model, {
      durationSec: body.duration ?? modelDef.defaults.duration ?? 5,
      enableAudio: body.enableAudio,
    });

    const jobId = await generateVideo(genRequest, {
      jobInput: {
        prompt: body.prompt,
        model,
        duration: body.duration,
        aspectRatio: body.aspectRatio,
        collectionAssetIds,
        referenceFileId,
        enableAudio: body.enableAudio,
        multiShot: body.multiShot,
      },
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
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit video generation" },
      { status: 500 }
    );
  }
}
