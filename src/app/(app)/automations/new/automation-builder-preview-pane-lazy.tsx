"use client";

import dynamic from "next/dynamic";

export const AutomationBuilderPreviewPaneLazy = dynamic(
  () =>
    import("./automation-builder-preview-pane").then((mod) => ({
      default: mod.AutomationBuilderPreviewPane,
    })),
  { ssr: false },
);
