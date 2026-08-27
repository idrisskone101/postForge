"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import type { SlideshowStudioProps } from "./types";

export function SlideshowStudioLazy(props: SlideshowStudioProps) {
  const ready = useWindowLoadReady();
  if (!ready) return <WorkspaceRouteSkeleton />;
  return <SlideshowStudioDynamic {...props} />;
}

function loadSlideshowStudio() {
  return import("@/components/slideshow/slideshow-studio");
}

const SlideshowStudioDynamic = dynamic(
  () =>
    loadSlideshowStudio().then((mod) => ({
      default: mod.SlideshowStudio,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);

void loadSlideshowStudio();
