"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const InspirationPageLazy = dynamic(
  () =>
    import("./inspiration-page-client").then((mod) => ({
      default: mod.InspirationPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
