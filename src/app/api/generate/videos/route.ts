import { NextRequest, NextResponse } from "next/server";
import { generateVideo } from "@/lib/ai/generate-video";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import type { VideoGenerationRequest } from "@/lib/ai/types";

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

    const genRequest: VideoGenerationRequest = {
      prompt: body.prompt,
      model,
      duration: body.duration,
      aspectRatio: body.aspectRatio,
      inputImageUrl: body.inputImageUrl,
      enableAudio: body.enableAudio,
      multiShot: body.multiShot,
    };

    const estimatedCost = calculateEstimatedCost(model, {
      durationSec: body.duration ?? modelDef.defaults.duration ?? 5,
      enableAudio: body.enableAudio,
    });

    const jobId = await generateVideo(genRequest);

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
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit video generation" },
      { status: 500 }
    );
  }
}
