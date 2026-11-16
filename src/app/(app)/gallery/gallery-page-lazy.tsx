"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import type { GalleryPageClientProps } from "./gallery-models";

type GalleryPageLazyProps = Omit<GalleryPageClientProps, "initialPage"> & {
  /**
   * The first page as one JSON string. As a nested prop each long prompt streams as its
   * own separately compressed chunk, which nearly tripled the document's transfer size.
   */
  initialPageJson: string;
};

export function GalleryPageLazy({ initialPageJson, ...filters }: GalleryPageLazyProps) {
  const ready = useWindowLoadReady();
  const initialPage = useMemo(
    () => JSON.parse(initialPageJson) as GalleryPageClientProps["initialPage"],
    [initialPageJson],
  );
  if (!ready) return null;
  return <GalleryPageDynamic {...filters} initialPage={initialPage} />;
}

const GalleryPageDynamic = dynamic(
  () =>
    import("./gallery-page-client").then((mod) => ({
      default: mod.GalleryPageClient,
    })),
  { ssr: false },
);
