import { NextRequest, NextResponse } from "next/server";
import { generateVideoSwap } from "@/lib/ai/generate-video";
import { getModel, calculateEstimatedCost } from "@/lib/ai/models";
import { prisma } from "@/lib/db";
import { storage, isStoragePathUnder } from "@/lib/storage";
import { uploadToFalStorage } from "@/lib/ai/fal-client";
import type { SwapMode } from "@/lib/ai/types";

const SWAP_MODES = new Set(["person", "object", "background"]);
const SWAP_RESOLUTIONS = new Set(["360p", "540p", "720p"]);
const TRUSTED_VIDEO_PREFIXES = ["tiktok-sources", "ugc-clone-sources"];

type StoredSwapAsset = {
  id: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  localPath: string;
  durationSec?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
};

async function loadSwapAsset(assetId: string): Promise<StoredSwapAsset | null> {
  const stored = await prisma.storedAsset.findUnique({
    where: { key: `swap-assets/${assetId}.json` },
    select: { data: true },
  });
  if (!stored?.data) return null;
  try {
    return JSON.parse(Buffer.from(stored.data).toString("utf8")) as StoredSwapAsset;
  } catch {
    return null;
  }
}

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
    let videoLocalPath: string | null = null;
    let videoDurationSec: number | null = null;
    let videoWidth: number | null = null;
    let videoHeight: number | null = null;
    let videoFilename = "source.mp4";

    const videoAsset = await loadSwapAsset(videoId);
    if (videoAsset) {
      videoLocalPath = videoAsset.localPath;
      videoDurationSec = videoAsset.durationSec ?? null;
      videoWidth = videoAsset.width ?? null;
      videoHeight = videoAsset.height ?? null;
      videoFilename = videoAsset.filename;
    } else {
      // Clone handoff path: a server-owned TikTok source path is trusted when
      // it lives under the source-video storage prefixes.
      const tiktokSource = await prisma.tikTokSource.findUnique({
        where: { id: videoId },
      });
      const sourcePath = tiktokSource?.localPath ?? null;
      if (
        tiktokSource &&
        sourcePath &&
        isStoragePathUnder(sourcePath, TRUSTED_VIDEO_PREFIXES)
      ) {
        videoLocalPath = sourcePath;
        videoDurationSec = tiktokSource.durationSec ?? null;
        videoWidth = tiktokSource.width ?? null;
        videoHeight = tiktokSource.height ?? null;
        videoFilename = tiktokSource.filename;
      }
    }

    if (!videoLocalPath) {
      return NextResponse.json(
        { error: "The source video could not be found" },
        { status: 404 }
      );
    }
    const videoFullPath = await storage.ensureLocalFile(videoLocalPath);

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
    let referenceFileLocalPath: string | null = null;
    if (!referenceAsset && typeof body.referenceFileId === "string" && body.referenceFileId) {
      const refFile = await prisma.generatedFile.findUnique({
        where: { id: body.referenceFileId },
      });
      if (!refFile) {
        return NextResponse.json(
          { error: "The clone reference image could not be found" },
          { status: 404 }
        );
      }
      referenceFileLocalPath = refFile.localPath;
    }

    if (model === "pixverse-swap" && !referenceAsset && !referenceFileLocalPath) {
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

    const [videoUrl, referenceUrl] = await Promise.all([
      uploadToFalStorage(videoFullPath),
      referenceAsset
        ? uploadToFalStorage(await storage.ensureLocalFile(referenceAsset.localPath))
        : referenceFileLocalPath
          ? uploadToFalStorage(await storage.ensureLocalFile(referenceFileLocalPath))
          : Promise.resolve(undefined),
    ]);

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
          referenceFileId:
            typeof body.referenceFileId === "string" ? body.referenceFileId : undefined,
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
