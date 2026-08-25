"use client";

import dynamic from "next/dynamic";
import { AutomationBuilderSkeleton } from "./automation-builder-skeleton";

export const AutomationBuilderLazy = dynamic(
  () =>
    import("./automation-builder-client").then((mod) => ({
      default: mod.AutomationBuilderClient,
    })),
  { ssr: false, loading: AutomationBuilderSkeleton },
);
