import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { storage } from "@/lib/storage";
import { execFileAsync, FFPROBE } from "@/lib/ugc/ffmpeg";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

type SwapVideoAsset = {
  id: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  localPath: string;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

type SwapImageAsset = {
  id: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  localPath: string;
  width: number | null;
  height: number | null;
  createdAt: string;
};

async function probeVideo(path: string) {
  try {
    const { stdout } = await execFileAsync(FFPROBE, [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,duration",
      "-of",
      "json",
      path,
    ]);
    const parsed = JSON.parse(stdout) as {
      streams?: Array<{ width?: string; height?: string; duration?: string }>;
    };
    const stream = parsed.streams?.[0];
    return {
      width: stream?.width ? Number(stream.width) : null,
      height: stream?.height ? Number(stream.height) : null,
      durationSec: stream?.duration ? Number(stream.duration) : null,
    };
  } catch {
    return { width: null, height: null, durationSec: null };
  }
}

async function probeImage(path: string) {
  try {
    const { stdout } = await execFileAsync(FFPROBE, [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "json",
      path,
    ]);
    const parsed = JSON.parse(stdout) as {
      streams?: Array<{ width?: string; height?: string }>;
    };
    const stream = parsed.streams?.[0];
    return {
      width: stream?.width ? Number(stream.width) : null,
      height: stream?.height ? Number(stream.height) : null,
    };
  } catch {
    return { width: null, height: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video");
    const imageFile = formData.get("reference");

    let savedVideo: SwapVideoAsset | null = null;
    let savedImage: SwapImageAsset | null = null;

    if (videoFile instanceof File) {
      if (!VIDEO_MIME_TYPES.has(videoFile.type)) {
        return NextResponse.json(
          { error: "Only MP4, MOV, WebM, and M4V videos are supported" },
          { status: 400 }
        );
      }
      if (videoFile.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: "Videos must be 100 MB or smaller" },
          { status: 400 }
        );
      }
      const id = randomUUID();
      const extension = videoFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp4";
      const filename = `${id}.${extension}`;
      const localPath = await storage.save(
        "swap-sources",
        filename,
        Buffer.from(await videoFile.arrayBuffer())
      );
      const probe = await probeVideo(await storage.ensureLocalFile(localPath));
      savedVideo = {
        id,
        filename,
        mimeType: videoFile.type,
        fileSizeBytes: videoFile.size,
        localPath,
        durationSec: probe.durationSec,
        width: probe.width,
        height: probe.height,
        createdAt: new Date().toISOString(),
      };
    }

    if (imageFile instanceof File) {
      if (!imageFile.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Only image files are supported for the swap reference" },
          { status: 400 }
        );
      }
      if (imageFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: "Reference images must be 25 MB or smaller" },
          { status: 400 }
        );
      }
      const id = randomUUID();
      const extension = imageFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
      const filename = `${id}.${extension}`;
      const localPath = await storage.save(
        "swap-sources",
        filename,
        Buffer.from(await imageFile.arrayBuffer())
      );
      const probe = await probeImage(await storage.ensureLocalFile(localPath));
      savedImage = {
        id,
        filename,
        mimeType: imageFile.type,
        fileSizeBytes: imageFile.size,
        localPath,
        width: probe.width,
        height: probe.height,
        createdAt: new Date().toISOString(),
      };
    }

    if (!savedVideo && !savedImage) {
      return NextResponse.json(
        { error: "Provide a video, a reference image, or both" },
        { status: 400 }
      );
    }

    const records = await Promise.all(
      [savedVideo, savedImage].filter(Boolean).map(async (asset) => {
        if (asset === null) return null;
        await prisma.storedAsset.upsert({
          where: { key: `swap-assets/${asset.id}.json` },
          update: {
            data: Uint8Array.from(
              Buffer.from(JSON.stringify(asset, null, 2), "utf8")
            ),
          },
          create: {
            key: `swap-assets/${asset.id}.json`,
            data: Uint8Array.from(
              Buffer.from(JSON.stringify(asset, null, 2), "utf8")
            ),
          },
        });
        return asset;
      })
    );

    return NextResponse.json(
      {
        video: savedVideo,
        reference: savedImage,
        stored: records.filter(Boolean).length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload swap asset:", error);
    return NextResponse.json(
      { error: "Failed to upload swap asset" },
      { status: 500 }
    );
  }
}
