"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const AutomationsPageLazy = dynamic(
  () =>
    import("./automations-page-client").then((mod) => ({
      default: mod.AutomationsPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
