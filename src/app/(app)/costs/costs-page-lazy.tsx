"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const CostsPageLazy = dynamic(
  () =>
    import("./costs-page-client").then((mod) => ({
      default: mod.CostsPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
