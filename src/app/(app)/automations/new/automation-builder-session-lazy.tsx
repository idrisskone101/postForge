"use client";

import dynamic from "next/dynamic";
import { AutomationBuilderLoading } from "./automation-builder-loading";

export const AutomationBuilderSessionLazy = dynamic(
  () =>
    import("./automation-builder-session").then((mod) => ({
      default: mod.AutomationBuilderSession,
    })),
  { ssr: false, loading: AutomationBuilderLoading },
);
