"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import type { GalleryPageClientProps } from "./gallery-page-client";

const GalleryPageDynamic = dynamic(
  () =>
    import("./gallery-page-client").then((mod) => ({
      default: mod.GalleryPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);

export function GalleryPageLazy(props: GalleryPageClientProps) {
  const ready = useWindowLoadReady();
  if (!ready) return <WorkspaceRouteSkeleton />;
  return <GalleryPageDynamic {...props} />;
}
