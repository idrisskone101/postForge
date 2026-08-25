"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import type { SlideshowStudioProps } from "./types";

const SlideshowStudioDynamic = dynamic(
  () =>
    import("@/components/slideshow/slideshow-studio").then((mod) => ({
      default: mod.SlideshowStudio,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);

export function SlideshowStudioLazy(props: SlideshowStudioProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (document.readyState === "complete") {
      setReady(true);
      return;
    }
    const onLoad = () => setReady(true);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  if (!ready) return <WorkspaceRouteSkeleton />;
  return <SlideshowStudioDynamic {...props} />;
}
