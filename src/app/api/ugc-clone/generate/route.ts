import { NextRequest, NextResponse } from "next/server";
import { generateClone, InvalidCloneRequestError } from "@/lib/ugc/generate-clone";
import { ensureCloneWorkerRunning } from "@/lib/ugc/clone-worker";

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

    if (
      body.referenceImageFileId !== undefined &&
      typeof body.referenceImageFileId !== "string"
    ) {
      return NextResponse.json(
        { error: "referenceImageFileId must be a string" },
        { status: 400 }
      );
    }

    if (
      body.savedReferenceId !== undefined &&
      typeof body.savedReferenceId !== "string"
    ) {
      return NextResponse.json(
        { error: "savedReferenceId must be a string" },
        { status: 400 }
      );
    }

    if (
      body.collectionAssetId !== undefined &&
      typeof body.collectionAssetId !== "string"
    ) {
      return NextResponse.json(
        { error: "collectionAssetId must be a string" },
        { status: 400 }
      );
    }

    const suppliedReferenceCount = [
      body.referenceImageFileId,
      body.savedReferenceId,
      body.collectionAssetId,
    ].filter((value) => typeof value === "string" && value.length > 0).length;
    if (suppliedReferenceCount > 1) {
      return NextResponse.json(
        { error: "Choose only one clone reference source" },
        { status: 400 }
      );
    }

    const { jobId, estimatedCost, modelId } = await generateClone({
      tiktokVideoPath: body.tiktokVideoPath,
      tiktokSourceId: body.tiktokSourceId,
      avatarId: body.avatarId,
      prompt: body.prompt,
      keepOriginalSound: body.keepOriginalSound,
      modelId: body.model,
      referenceImageFileId: body.referenceImageFileId,
      collectionAssetId: body.collectionAssetId,
      savedReferenceId: body.savedReferenceId,
      durationSec: typeof body.durationSec === "number" ? body.durationSec : undefined,
      removeTextOverlays: body.removeTextOverlays === true,
    });
    ensureCloneWorkerRunning();

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
    if (error instanceof InvalidCloneRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("UGC clone generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit clone generation" },
      { status: 500 }
    );
  }
}
