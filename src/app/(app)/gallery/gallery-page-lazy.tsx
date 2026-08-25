"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const GalleryPageLazy = dynamic(
  () =>
    import("./gallery-page-client").then((mod) => ({
      default: mod.GalleryPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
