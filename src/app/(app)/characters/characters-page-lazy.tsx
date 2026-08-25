"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const CharactersPageLazy = dynamic(
  () =>
    import("./characters-page-client").then((mod) => ({
      default: mod.CharactersPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
