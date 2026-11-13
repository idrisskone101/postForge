"use client";

import dynamic from "next/dynamic";
import { PerformanceSkeleton } from "./performance-skeleton";

export const PerformancePageLazy = dynamic(
  () =>
    import("./performance-page-client").then((mod) => ({
      default: mod.PerformancePageClient,
    })),
  { ssr: false, loading: PerformanceSkeleton },
);
