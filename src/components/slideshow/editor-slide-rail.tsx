"use client";

import { useState } from "react";
import { SquareSlash } from "lucide-react";

import { Button, Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";

import { MAX_SLIDESHOW_SLIDES } from "./model";
import { VisualTile } from "./slide-preview";
import { slideCoverImage } from "./slideshow-view";
import { useSlideshowEditor } from "./slideshow-editor-provider";
import type { SlideshowAspectRatio, SlideshowSlide } from "./types";

export function EditorSlideRail() {
  const { draft, activeIndex, activeThumbRef, selectSlide, addSlide } =
    useSlideshowEditor();
  const atMax = draft.slides.length >= MAX_SLIDESHOW_SLIDES;
  return (
    <aside
      aria-label="Slides"
      className="wb-panel gap-2 p-0 lg:col-span-2 max-xl:flex-row max-xl:items-center xl:w-[148px] xl:shrink-0"
    >
      <ol className="wb-scroll-fade wb-scroll-fade-xl-y flex min-h-0 min-w-0 flex-1 gap-2 overflow-x-auto px-3.5 pb-3.5 pt-[18px] xl:flex-col xl:overflow-x-visible xl:overflow-y-auto xl:pb-1">
        {draft.slides.map((slide, index) => (
          <li key={slide.id} className="flex shrink-0 items-center gap-2 max-xl:flex-col-reverse max-xl:gap-1">
            <span
              className={cn(
                "w-3.5 shrink-0 text-center text-[12px] leading-4",
                index === activeIndex
                  ? "font-bold text-ember-text"
                  : "font-semibold text-fg-muted",
              )}
            >
              {index + 1}
            </span>
            <button
              type="button"
              ref={index === activeIndex ? activeThumbRef : undefined}
              data-slide-thumb={slide.id}
              aria-current={index === activeIndex ? "true" : undefined}
              aria-label={`Select slide ${index + 1}`}
              onClick={() => selectSlide(slide)}
              className={cn(
                "relative block shrink-0 overflow-hidden rounded-lg bg-media transition-shadow duration-160 ease-pf",
                THUMB_SHAPE[draft.aspectRatio],
                index === activeIndex &&
                  "shadow-[0_0_0_2px_var(--pf-panel),0_0_0_4px_var(--pf-ember)]",
              )}
            >
              <RailThumb key={slideCoverImage(slide) ?? slide.visualKey} slide={slide} />
            </button>
          </li>
        ))}
      </ol>
      <div className="shrink-0 px-3.5 pb-3.5 max-xl:pb-0 max-xl:pl-0 max-xl:pt-1">
        <Button block onClick={addSlide} disabled={atMax} className="[&>svg]:size-3.5">
          <Icon name="plus" size={14} />
          Add slide
        </Button>
      </div>
    </aside>
  );
}

const THUMB_SHAPE: Record<SlideshowAspectRatio, string> = {
  "9:16": "aspect-[9/16] w-[76px] max-xl:w-14",
  "4:5": "aspect-[4/5] w-[76px] max-xl:w-14",
  "1:1": "aspect-square w-[76px] max-xl:w-14",
  "16:9": "aspect-video w-[76px] max-xl:w-[100px]",
};

function RailThumb({ slide }: { slide: SlideshowSlide }) {
  const cover = slideCoverImage(slide);
  const [failed, setFailed] = useState(false);
  if (cover && failed) {
    return (
      <span
        role="img"
        aria-label="Image unavailable"
        className="absolute inset-0 grid place-items-center bg-warn-tint text-warn"
      >
        <SquareSlash className="size-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }
  if (!cover) {
    return <VisualTile visualKey={slide.visualKey} className="absolute inset-0" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cover}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="absolute inset-0 size-full object-cover"
    />
  );
}
