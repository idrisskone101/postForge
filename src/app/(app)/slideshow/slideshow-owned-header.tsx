"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { useWindowLoadReady } from "@/lib/use-window-load-ready";

import { useSlideshowNew } from "./slideshow-new-context";
import { SlideshowPaintText } from "./slideshow-paint-text";

export function SlideshowOwnedHeader() {
  const paintReady = useWindowLoadReady();
  const { openTemplateDialog } = useSlideshowNew();
  const TITLE = "Slideshow";
  const COPY = "Create, edit, automate, and export AI image carousels.";

  return (
    <header className="flex flex-nowrap items-end justify-between gap-3 pt-7">
      <div className="min-w-0">
        <h1 data-home-title={paintReady ? undefined : TITLE}>
          <SlideshowPaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="block text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-foreground"
            paint={<span className="sr-only">{TITLE}</span>}
          >
            {TITLE}
          </SlideshowPaintText>
        </h1>
        <p data-slideshow-copy={paintReady ? undefined : COPY} className="mt-1">
          <SlideshowPaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="block max-w-[12rem] truncate text-[13px] leading-none text-muted-foreground"
            paint={<span className="sr-only">{COPY}</span>}
          >
            {COPY}
          </SlideshowPaintText>
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
