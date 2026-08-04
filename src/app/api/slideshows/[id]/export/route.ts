import { NextRequest } from "next/server";
import {
  renderSlideshowArchive,
  renderSlideshowVideo,
  type SlideshowRenderFormat,
} from "@/lib/ai/slideshow-renderer";
import { badRequest } from "@/lib/slideshow/errors";
import { slideshowErrorResponse } from "@/lib/slideshow/http";
import {
  getSlideshowRenderProject,
  recordSlideshowExport,
} from "@/lib/slideshow/service";

export const runtime = "nodejs";

type ExportRequestBody = {
  type?: unknown;
  format?: unknown;
  secondsPerSlide?: unknown;
  caption?: unknown;
};

function filename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "slideshow";
}

async function exportSlideshow(
  request: NextRequest,
  id: string,
  body: ExportRequestBody = {},
) {
  try {
    const project = await getSlideshowRenderProject(id);
    if (!project.slides.length) badRequest("A slideshow needs at least one slide to export");
    const type =
      (typeof body.type === "string" ? body.type : null) ??
      request.nextUrl.searchParams.get("type") ??
      "carousel";
    const baseName = filename(project.title);
    const caption =
      body.caption === undefined
        ? project.caption ?? ""
        : typeof body.caption === "string"
          ? body.caption.trim()
          : badRequest("caption must be a string");
    if (caption.length > 2_200) badRequest("caption must be 2200 characters or fewer");

    if (type === "video" || type === "mp4") {
      const seconds = Number(
        body.secondsPerSlide ??
          request.nextUrl.searchParams.get("secondsPerSlide") ??
          "2.5"
      );
      if (!Number.isFinite(seconds) || seconds < 0.5 || seconds > 10) {
        badRequest("secondsPerSlide must be between 0.5 and 10");
      }
      const video = await renderSlideshowVideo(project, {
        secondsPerSlide: seconds,
      });
      const receipt = await recordSlideshowExport(id, "mp4");
      return new Response(new Uint8Array(video), {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(video.length),
          "Content-Disposition": `attachment; filename="${baseName}.mp4"`,
          "Cache-Control": "no-store",
          "X-PostForge-Export-Count": String(receipt.successfulExportCount),
          "X-PostForge-Exported-At": receipt.exportedAt,
          "X-PostForge-Export-Format": receipt.format,
        },
      });
    }

    if (type !== "carousel" && type !== "zip") {
      badRequest("type must be carousel, zip, video, or mp4");
    }
    const formatValue =
      (typeof body.format === "string" ? body.format : null) ??
      request.nextUrl.searchParams.get("format") ??
      "jpeg";
    if (formatValue !== "jpeg" && formatValue !== "png" && formatValue !== "webp") {
      badRequest("format must be jpeg, png, or webp");
    }
    const archive = await renderSlideshowArchive(
      project,
      formatValue as SlideshowRenderFormat,
      caption,
    );
    const receipt = await recordSlideshowExport(id, "photo-carousel");
    return new Response(new Uint8Array(archive), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Length": String(archive.length),
        "Content-Disposition": `attachment; filename="${baseName}.zip"`,
        "Cache-Control": "no-store",
        "X-PostForge-Export-Count": String(receipt.successfulExportCount),
        "X-PostForge-Exported-At": receipt.exportedAt,
        "X-PostForge-Export-Format": receipt.format,
      },
    });
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to export slideshow");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return exportSlideshow(request, id);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as ExportRequestBody;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      badRequest("Export options must be an object");
    }
    return exportSlideshow(request, id, body);
  } catch (error) {
    return slideshowErrorResponse(error, "Failed to export slideshow");
  }
}
