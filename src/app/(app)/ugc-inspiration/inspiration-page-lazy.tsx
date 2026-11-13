"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/workbench/skeleton";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import type { InspirationPageClientProps } from "./types";

export function InspirationPageLazy(props: InspirationPageClientProps) {
  const ready = useWindowLoadReady();
  if (!ready) return <InspirationSkeleton />;
  return <InspirationPageDynamic {...props} />;
}

function InspirationSkeleton() {
  return (
    <div
      data-route-skeleton="true"
      aria-hidden="true"
      className="flex min-h-[320px] min-w-0 flex-1 flex-col gap-3 lg:flex-row"
    >
      <Skeleton shape="panel" className="h-[120px] lg:h-auto lg:w-[264px] lg:flex-none" />
      <Skeleton shape="panel" className="min-h-[480px] flex-1" />
    </div>
  );
}

const InspirationPageDynamic = dynamic(
  () =>
    import("./inspiration-page-client").then((mod) => ({
      default: mod.InspirationPageClient,
    })),
  { ssr: false, loading: InspirationSkeleton },
);
