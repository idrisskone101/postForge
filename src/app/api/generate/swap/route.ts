import { NextRequest, NextResponse } from "next/server";
import { generateVideoSwap } from "@/lib/ai/generate-video";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import {
  loadSwapAsset,
  resolveSwapReferenceUrl,
  resolveSwapSourceVideoUrl,
  type StoredSwapAsset,
} from "@/lib/swap-assets-server";
import type { SwapMode } from "@/lib/ai/types";

const SWAP_MODES = new Set(["person", "object", "background"]);
const SWAP_RESOLUTIONS = new Set(["360p", "540p", "720p"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required and must be a string" },
        { status: 400 }
      );
    }
    const model = typeof body.model === "string" ? body.model : "pixverse-swap";
    const modelDef = getModel(model);
    if (!modelDef || modelDef.capabilities.subjectSwap !== true) {
      return NextResponse.json(
        { error: `Unknown subject swap model: ${model}` },
        { status: 400 }
      );
    }

    const videoId = typeof body.swapVideoId === "string" ? body.swapVideoId : "";
    if (!videoId) {
      return NextResponse.json(
        { error: "swapVideoId is required" },
        { status: 400 }
      );
    }

    const resolvedVideo = await resolveSwapSourceVideoUrl(videoId);
    if (!resolvedVideo) {
      return NextResponse.json(
        { error: "The source video could not be found" },
        { status: 404 }
      );
    }
    const { url: videoUrl, durationSec: videoDurationSec, filename: videoFilename } =
      resolvedVideo;
    const videoAsset = await loadSwapAsset(videoId);
    const videoWidth = videoAsset?.width ?? null;
    const videoHeight = videoAsset?.height ?? null;

    let referenceAsset: StoredSwapAsset | null = null;
    if (typeof body.swapReferenceId === "string" && body.swapReferenceId) {
      referenceAsset = await loadSwapAsset(body.swapReferenceId);
      if (!referenceAsset) {
        return NextResponse.json(
          { error: "The uploaded swap reference could not be found" },
          { status: 404 }
        );
      }
    }

    // Clone handoff path: a generated reference image (from the Clone
    // reference-image pipeline) is a server-owned GeneratedFile.
    const referenceFileId =
      typeof body.referenceFileId === "string" ? body.referenceFileId : undefined;

    let referenceUrl: string | undefined;
    if (referenceAsset) {
      referenceUrl = (await resolveSwapReferenceUrl(referenceAsset.id)) ?? undefined;
      if (!referenceUrl) {
        return NextResponse.json(
          { error: "The uploaded swap reference could not be found" },
          { status: 404 }
        );
      }
    } else if (referenceFileId) {
      referenceUrl = (await resolveSwapReferenceUrl(referenceFileId)) ?? undefined;
      if (!referenceUrl) {
        return NextResponse.json(
          { error: "The clone reference image could not be found" },
          { status: 404 }
        );
      }
    }

    if (model === "pixverse-swap" && !referenceUrl) {
      return NextResponse.json(
        { error: "PixVerse Swap requires a reference image" },
        { status: 400 }
      );
    }

    const swapMode: SwapMode =
      typeof body.swapMode === "string" && SWAP_MODES.has(body.swapMode)
        ? (body.swapMode as SwapMode)
        : "person";
    const resolution =
      typeof body.resolution === "string" && SWAP_RESOLUTIONS.has(body.resolution)
        ? body.resolution
        : "720p";
    const keyframeId =
      typeof body.keyframeId === "number" && Number.isInteger(body.keyframeId)
        ? body.keyframeId
        : 1;
    const keepOriginalSound =
      typeof body.keepOriginalSound === "boolean"
        ? body.keepOriginalSound
        : true;

    const estimatedCost = calculateEstimatedCost(model, {
      durationSec: videoDurationSec ?? undefined,
    });

    const jobId = await generateVideoSwap(
      {
        prompt: body.prompt,
        model,
        videoUrl,
        referenceImageUrl: referenceUrl,
        swapMode,
        keyframeId,
        resolution: resolution as "360p" | "540p" | "720p",
        keepOriginalSound,
      },
      {
        jobInput: {
          prompt: body.prompt,
          model,
          swapVideoId: videoId,
          swapReferenceId: referenceAsset?.id ?? undefined,
          referenceFileId: referenceFileId ?? undefined,
          swapMode,
          keyframeId,
          resolution,
          keepOriginalSound,
          sourceVideo: {
            filename: videoFilename,
            durationSec: videoDurationSec,
            width: videoWidth,
            height: videoHeight,
          },
        },
      }
    );

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
    console.error("Subject swap generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit subject swap generation",
      },
      { status: 500 }
    );
  }
}
