"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const SlideshowStudioLazy = dynamic(
  () =>
    import("@/components/slideshow/slideshow-studio").then((mod) => ({
      default: mod.SlideshowStudio,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
