"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { useWindowLoadReady } from "@/lib/use-window-load-ready";

import { useSlideshowNew } from "./slideshow-new-context";

export function SlideshowOwnedHeader() {
  const { openTemplateDialog } = useSlideshowNew();
  const TITLE = "Slideshow";
  const COPY = "Create, edit, automate, and export AI image carousels.";

  return (
    <header className="flex flex-nowrap items-end justify-between gap-3 pt-7">
      <div className="min-w-0">
        <h1 data-home-title={TITLE}>
          <span className="sr-only">{TITLE}</span>
        </h1>
        <p data-slideshow-copy={COPY} className="mt-1">
          <span className="sr-only">{COPY}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={openTemplateDialog}
        className="pf-button-primary shrink-0"
      >
        <Plus className="size-3.5" />
        New Slideshow
      </button>
    </header>
  );
}

export function SlideshowStudioFrame({ children }: { children: ReactNode }) {
  const paintReady = useWindowLoadReady();
  return (
    <div data-slideshow-studio={paintReady ? undefined : "true"}>{children}</div>
  );
}
