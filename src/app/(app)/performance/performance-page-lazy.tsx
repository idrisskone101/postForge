"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const PerformancePageLazy = dynamic(
  () =>
    import("./performance-page-client").then((mod) => ({
      default: mod.PerformancePageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
