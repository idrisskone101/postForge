"use client";

import dynamic from "next/dynamic";
import { WorkspaceRouteSkeleton } from "@/components/workspace-route-skeleton";

export const JobsActivityLazy = dynamic(
  () =>
    import("./jobs-activity").then((mod) => ({
      default: mod.JobsActivity,
    })),
  { ssr: false, loading: WorkspaceRouteSkeleton },
);
