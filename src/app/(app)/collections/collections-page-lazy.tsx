"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const CollectionsPageLazy = dynamic(
  () =>
    import("./collections-page-client").then((mod) => ({
      default: mod.CollectionsPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
