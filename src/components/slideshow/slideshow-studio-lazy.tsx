"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/workbench/page-header";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import type { SlideshowStudioProps } from "./types";

export function SlideshowStudioLazy(props: SlideshowStudioProps) {
  const ready = useWindowLoadReady();
  if (!ready) return <StudioFirstPaint />;
  return <SlideshowStudioDynamic {...props} />;
}

function StudioFirstPaint() {
  return (
    <>
      <PageHeader title="Slideshow" stackBelow={480} />
      <WorkspaceRouteSkeleton />
    </>
  );
}

const SlideshowStudioDynamic = dynamic(
  () =>
    import("@/components/slideshow/slideshow-studio").then((mod) => ({
      default: mod.SlideshowStudio,
    })),
  { ssr: false, loading: StudioFirstPaint },
);
