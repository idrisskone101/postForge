"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import type { GalleryPageClientProps } from "./gallery-page-client";

export function GalleryPageLazy(props: GalleryPageClientProps) {
  const ready = useWindowLoadReady();
  if (!ready) return <WorkspaceRouteSkeleton />;
  return <GalleryPageDynamic {...props} />;
}

const GalleryPageDynamic = dynamic(
  () =>
    import("./gallery-page-client").then((mod) => ({
      default: mod.GalleryPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
