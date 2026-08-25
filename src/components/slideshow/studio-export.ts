import { downloadSlideshowExport } from "@/lib/slideshow/client";

import type { SlideshowProject, SlideshowPublishOptions } from "./types";

export {
  applyStudioExportReceipt,
  applyStudioExportReceiptToProject,
} from "./studio-export-receipt";

export async function exportStudioSlideshow(input: {
  project: SlideshowProject;
  options: SlideshowPublishOptions;
  apiBaseUrl: string;
  onExportProject?: (
    project: SlideshowProject,
    options: SlideshowPublishOptions,
  ) => Promise<void>;
  applyExportReceipt: (
    projectId: string,
    receipt: { successfulExportCount: number; exportedAt: string },
  ) => void;
  showToast: (message: string) => void;
}) {
  const { project, options } = input;
  if (input.onExportProject) {
    await input.onExportProject(project, options);
  } else if (options.destination === "download") {
    const receipt = await downloadSlideshowExport(
      project,
      input.apiBaseUrl,
      options.format,
      options.caption,
    );
    if (receipt) input.applyExportReceipt(project.id, receipt);
  } else {
    throw new Error(
      "TikTok dispatch is not connected. Download the slideshow or connect an approved posting account.",
    );
  }
  input.showToast(
    options.destination === "download"
      ? "Slideshow export started."
      : "Slideshow sent to the publishing queue.",
  );
}
