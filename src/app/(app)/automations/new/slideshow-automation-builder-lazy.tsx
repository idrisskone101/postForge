"use client";

import dynamic from "next/dynamic";

export const SlideshowAutomationBuilderLazy = dynamic(
  () =>
    import("./slideshow-automation-builder").then((mod) => ({
      default: mod.SlideshowAutomationBuilder,
    })),
  { ssr: true },
);
