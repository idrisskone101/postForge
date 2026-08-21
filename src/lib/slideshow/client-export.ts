import type { SlideshowProject } from "@/components/slideshow/types";
import { isLocalSlideshowId } from "@/components/slideshow/types";
import {
  SlideshowApiError,
  readJsonResponse,
} from "@/lib/slideshow/client-request";

function fileNameFromDisposition(value: string | null, fallback: string) {
  const match = value?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
}

export async function downloadSlideshowExport(
  project: SlideshowProject,
  apiBaseUrl = "/api/slideshows",
  format: "photo-carousel" | "mp4" = "photo-carousel",
  caption = project.caption ?? "",
) {
  if (isLocalSlideshowId(project.id)) {
    throw new SlideshowApiError(
      "Wait for the draft to finish saving before exporting.",
      409,
    );
  }

  const response = await fetch(
    `${apiBaseUrl}/${encodeURIComponent(project.id)}/export`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: format === "mp4" ? "video" : "carousel",
        secondsPerSlide: 2.5,
        caption,
      }),
    },
  );
  if (!response.ok) {
    await readJsonResponse(response);
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileNameFromDisposition(
    response.headers.get("content-disposition"),
    `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "slideshow"}.${
      format === "mp4" ? "mp4" : "zip"
    }`,
  );
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

  if (format === "mp4" && caption.trim()) {
    const captionUrl = URL.createObjectURL(
      new Blob([`${caption.trim()}\n`], { type: "text/plain;charset=utf-8" }),
    );
    const captionAnchor = document.createElement("a");
    captionAnchor.href = captionUrl;
    captionAnchor.download = `${
      project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "slideshow"
    }-caption.txt`;
    document.body.append(captionAnchor);
    captionAnchor.click();
    captionAnchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(captionUrl), 1_000);
  }

  const exportedAt = response.headers.get("x-postforge-exported-at");
  const count = Number(response.headers.get("x-postforge-export-count"));
  return {
    successfulExportCount:
      Number.isSafeInteger(count) && count >= 0
        ? count
        : (project.successfulExportCount ?? 0) + 1,
    exportedAt:
      exportedAt && Number.isFinite(Date.parse(exportedAt))
        ? exportedAt
        : new Date().toISOString(),
  };
}
