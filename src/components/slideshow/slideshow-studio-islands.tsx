"use client";

import dynamic from "next/dynamic";

export const PublishDialog = dynamic(() =>
  import("./publish-dialog").then((mod) => ({ default: mod.PublishDialog })),
);

export const SlideshowEditor = dynamic(() =>
  import("./slideshow-editor").then((mod) => ({ default: mod.SlideshowEditor })),
);

export const TemplateDialog = dynamic(() =>
  import("./template-dialog").then((mod) => ({ default: mod.TemplateDialog })),
);
