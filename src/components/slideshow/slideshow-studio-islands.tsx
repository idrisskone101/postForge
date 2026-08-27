"use client";

import dynamic from "next/dynamic";

export const CreateView = dynamic(
  () => import("./create-view").then((mod) => ({ default: mod.CreateView })),
  {
    loading: () => <div data-slideshow-create="true" aria-hidden="true" />,
  },
);

export const DraftsView = dynamic(() =>
  import("./drafts-view").then((mod) => ({ default: mod.DraftsView })),
);

export const PublishDialog = dynamic(
  () => import("./publish-dialog").then((mod) => ({ default: mod.PublishDialog })),
  { ssr: false },
);

export const SlideshowEditor = dynamic(
  () => import("./slideshow-editor").then((mod) => ({ default: mod.SlideshowEditor })),
  { ssr: false },
);

export const TemplateDialog = dynamic(
  () => import("./template-dialog").then((mod) => ({ default: mod.TemplateDialog })),
  { ssr: false },
);
