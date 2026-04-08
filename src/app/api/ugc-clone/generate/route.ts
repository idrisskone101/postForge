import { NextRequest, NextResponse } from "next/server";
import { generateClone } from "@/lib/ugc/generate-clone";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.tiktokSourceId || typeof body.tiktokSourceId !== "string") {
      return NextResponse.json(
        { error: "tiktokSourceId is required" },
        { status: 400 }
      );
    }

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

    const { jobId, estimatedCost, modelId } = await generateClone({
      tiktokSourceId: body.tiktokSourceId,
      tiktokVideoPath: body.tiktokVideoPath,
      avatarId: body.avatarId,
      prompt: body.prompt,
      keepOriginalSound: body.keepOriginalSound,
      modelId: body.model,
      referenceImageFileId: body.referenceImageFileId,
      durationSec: typeof body.durationSec === "number" ? body.durationSec : undefined,
      removeTextOverlays: body.removeTextOverlays === true,
    });

    return NextResponse.json(
      {
        id: jobId,
        status: "queued",
        model: modelId,
        estimatedCost,
        createdAt: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("UGC clone generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit clone generation" },
      { status: 500 }
    );
  }
}
