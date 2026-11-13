"use client";

import { useState } from "react";

import { Button, IconButton } from "@/components/workbench";
import { cn } from "@/lib/utils";

import { SlidePreview } from "./slide-preview";
import { slideCoverImage } from "./slideshow-view";
import { EditorStageHead } from "./editor-stage-head";
import { useSlideshowEditor } from "./slideshow-editor-provider";
import type { SlideshowAspectRatio } from "./types";

export function EditorPreview() {
  const {
    draft,
    activeSlide,
    activeIndex,
    viewMode,
    regeneratingImage,
    selectSlide,
    changeViewMode,
    updateProject,
    setPickerOpen,
  } = useSlideshowEditor();
  const previous = draft.slides[activeIndex - 1];
  const next = draft.slides[activeIndex + 1];
  const cover = slideCoverImage(activeSlide);
  return (
    <section
      aria-label="Slideshow preview"
      className="wb-panel min-w-0 xl:min-h-0 xl:flex-1"
    >
      <EditorStageHead
        viewMode={viewMode}
        aspectRatio={draft.aspectRatio}
        onViewChange={changeViewMode}
        onAspectChange={(aspectRatio) =>
          updateProject((current) => ({ ...current, aspectRatio }))
        }
      />
      <div
        aria-busy={regeneratingImage || undefined}
        className="relative flex min-h-[420px] flex-1 items-center justify-center gap-2 rounded-lg bg-well px-3 py-6 sm:gap-5 xl:min-h-[640px] xl:py-0"
      >
        <IconButton
          icon="chevron-left"
          label="Previous slide"
          className="size-9"
          disabled={!previous}
          onClick={() => previous && selectSlide(previous)}
        />
        <div
          className={cn(
            "relative min-w-0 shrink transition-opacity duration-200 ease-pf",
            regeneratingImage && "opacity-60",
          )}
          style={{ width: stageSlideWidth(draft.aspectRatio) }}
        >
          <SlidePreview
            slide={activeSlide}
            aspectRatio={draft.aspectRatio}
            phaseSettings={draft.phaseSettings[activeSlide.kind]}
            textSettings={draft.textSettings}
            className="w-full rounded-lg"
          />
          {cover ? (
            <StageImageCheck
              key={cover}
              src={cover}
              onChoose={() => setPickerOpen(true)}
            />
          ) : null}
        </div>
        <IconButton
          icon="chevron-right"
          label="Next slide"
          className="size-9"
          disabled={!next}
          onClick={() => next && selectSlide(next)}
        />
        {regeneratingImage ? (
          <span
            role="status"
            className="wb-float wb-fade-in absolute bottom-4 left-1/2 flex h-10 -translate-x-1/2 items-center gap-2.5 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap"
          >
            <span className="wb-live-dot" />
            Rendering slide image
          </span>
        ) : null}
      </div>
    </section>
  );
}

function stageSlideWidth(aspectRatio: SlideshowAspectRatio) {
  const [w, h] = aspectRatio.split(":").map(Number);
  return `min(100%, ${Math.round((560 * w) / h)}px)`;
}

function StageImageCheck({ src, onChoose }: { src: string; onChoose: () => void }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" aria-hidden="true" className="sr-only" onError={() => setFailed(true)} />
    );
  }
  return (
    <div
      role="alert"
      className="wb-notice wb-fade-in absolute inset-x-3 top-3 justify-between"
      data-tone="warn"
    >
      <span>
        <strong>Image unavailable.</strong>
      </span>
      <Button size={32} onClick={onChoose}>
        Choose images
      </Button>
    </div>
  );
}
