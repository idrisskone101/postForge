"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import type { InspirationPageClientProps } from "./types";

export function InspirationPageLazy(props: InspirationPageClientProps) {
  const ready = useWindowLoadReady();
  if (!ready) return <WorkspaceRouteSkeleton />;
  return <InspirationPageDynamic {...props} />;
}

const InspirationPageDynamic = dynamic(
  () =>
    import("./inspiration-page-client").then((mod) => ({
      default: mod.InspirationPageClient,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
