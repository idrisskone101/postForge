import { NextRequest, NextResponse } from "next/server";
import { generateReferenceImage } from "@/lib/ugc/generate-reference-image";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.tiktokVideoPath || typeof body.tiktokVideoPath !== "string") {
      return NextResponse.json(
        { error: "tiktokVideoPath is required" },
        { status: 400 }
      );
    }

    if (!body.avatarId || typeof body.avatarId !== "string") {
      return NextResponse.json(
        { error: "avatarId is required" },
        { status: 400 }
      );
    }

    const { jobId, estimatedCost, model } = await generateReferenceImage({
      tiktokVideoPath: body.tiktokVideoPath,
      avatarId: body.avatarId,
      prompt: body.prompt,
      imageModel: body.imageModel,
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
    console.error("Reference image generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate reference image" },
      { status: 500 }
    );
  }
}
