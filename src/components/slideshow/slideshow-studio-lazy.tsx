"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import type { SlideshowStudioProps } from "./types";

export function SlideshowStudioLazy(props: SlideshowStudioProps) {
  return <SlideshowStudioDynamic {...props} />;
}

const SlideshowStudioDynamic = dynamic(
  () =>
    import("@/components/slideshow/slideshow-studio").then((mod) => ({
      default: mod.SlideshowStudio,
    })),
  { loading: WorkspaceRouteSkeleton },
);
