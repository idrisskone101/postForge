"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const SettingsPageLazy = dynamic(
  () =>
    import("./settings-page-client").then((mod) => ({
      default: mod.SettingsPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
