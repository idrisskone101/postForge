"use client";

import dynamic from "next/dynamic";
import { AutomationBuilderSkeleton } from "./automation-builder-skeleton";

export const AutomationBuilderSessionLazy = dynamic(
  () =>
    import("./automation-builder-session").then((mod) => ({
      default: mod.AutomationBuilderSession,
    })),
  { ssr: false, loading: AutomationBuilderSkeleton },
);
