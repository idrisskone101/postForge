import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ai/generate-image";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import type { ImageGenerationRequest } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required and must be a string" },
        { status: 400 }
      );
    }

    const model = body.model ?? "nano-banana-2";

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

    const genRequest: ImageGenerationRequest = {
      prompt: body.prompt,
      model,
      aspectRatio: body.aspectRatio,
      numImages: body.numImages,
      negativePrompt: body.negativePrompt,
      imageUrls: body.referenceImageUrls ?? body.imageUrls,
      enableWebSearch: body.enableWebSearch,
    };

    const estimatedCost = calculateEstimatedCost(model, {
      numImages: body.numImages ?? modelDef.defaults.numImages ?? 1,
    });

    const jobId = await generateImage(genRequest);

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
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit image generation" },
      { status: 500 }
    );
  }
}
