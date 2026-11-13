"use client";

import dynamic from "next/dynamic";
import { HubSkeleton } from "./hub-skeleton";

export const AutomationsPageLazy = dynamic(
  () =>
    import("./automations-page-client").then((mod) => ({
      default: mod.AutomationsPageClient,
    })),
  { ssr: false, loading: HubSkeleton },
);
