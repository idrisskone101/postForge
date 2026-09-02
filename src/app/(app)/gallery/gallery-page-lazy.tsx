"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import type { GalleryPageClientProps } from "./gallery-models";

export function GalleryPageLazy(props: GalleryPageClientProps) {
  const ready = useWindowLoadReady();
  useEffect(() => {
    if (!ready) return;
    hideGalleryFirstPaint();
  }, [ready]);
  if (!ready) return null;
  return <GalleryPageDynamic {...props} />;
}

const GalleryPageDynamic = dynamic(
  () =>
    import("./gallery-page-client").then((mod) => ({
      default: mod.GalleryPageClient,
    })),
  { ssr: false },
);

function hideGalleryFirstPaint() {
  document
    .querySelector("[data-gallery-first-body]")
    ?.setAttribute("hidden", "");
  document.getElementById("workspace-header-accessory")?.replaceChildren();
}
