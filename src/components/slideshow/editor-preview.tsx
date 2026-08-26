"use client";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { MAX_SLIDESHOW_SLIDES } from "./model";
import { SlidePreview, VisualTile } from "./slide-preview";
import { slideCoverImage } from "./slideshow-view";
import { ICON_BTN } from "./studio-ui";
import { useSlideshowEditor } from "./slideshow-editor-provider";

export function EditorPreview() {
  const {
    draft,
    previewIndices,
    activeIndex,
    regeneratingImage,
    activeThumbRef,
    selectSlide,
    addSlide,
    moveSlide,
    duplicateSlide,
    deleteSlide,
  } = useSlideshowEditor();
  return (
        <section aria-label="Slideshow preview" className="flex min-w-0 flex-col">
          <div
            className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden bg-[#09090B] p-4 sm:p-6"
          >
            <div className="flex h-full max-w-full items-center justify-center gap-5 overflow-hidden">
              {previewIndices.map((index) => {
                const slide = draft.slides[index];
                const active = index === activeIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => selectSlide(slide)}
                    aria-label={`Select slide ${index + 1}`}
                    className={cn(
                      "min-w-0 shrink-0 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/40",
                      active
                        ? "w-[min(58vw,300px)] opacity-100 sm:w-[min(38vh,318px)]"
                        : "max-md:hidden w-[168px] opacity-40 hover:opacity-70 md:block",
                      draft.aspectRatio === "16:9" &&
                        (active ? "w-[min(80vw,520px)]" : "w-[280px]"),
                      draft.aspectRatio === "1:1" &&
                        (active ? "w-[min(58vw,380px)]" : "w-[200px]"),
                    )}
                  >
                    <SlidePreview
                      slide={slide}
                      aspectRatio={draft.aspectRatio}
                      phaseSettings={draft.phaseSettings[slide.kind]}
                      textSettings={draft.textSettings}
                      showCounter
                      counter={`${index + 1}/${draft.slides.length}`}
                      className={cn(
                        "w-full",
                        active
                          ? "rounded-lg border-[6px] border-white shadow-[0_24px_56px_rgba(35,35,35,0.22)]"
                          : "rounded-[6px] border-4 border-white shadow-[0_10px_28px_rgba(35,35,35,0.14)]",
                      )}
                    />
                  </button>
                );
              })}
            </div>
            {regeneratingImage ? (
              <div className="absolute inset-0 grid place-items-center bg-[var(--pf-active)]/70 backdrop-blur-[1px]">
                <span className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-semibold text-foreground shadow-[var(--pf-shadow-lg)]">
                  <LoaderCircle className="size-3.5 animate-spin text-[var(--pf-orange)]" />
                  Rendering slide visual...
                </span>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border bg-[var(--pf-surface)] px-3 py-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={addSlide}
                disabled={draft.slides.length >= MAX_SLIDESHOW_SLIDES}
                aria-label="Add slide"
                className="grid h-14 w-11 shrink-0 place-items-center rounded-lg border border-dashed border-[var(--pf-border-strong)] text-muted-foreground transition hover:border-[var(--pf-orange)] hover:text-[var(--pf-orange)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
              {draft.slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  ref={index === activeIndex ? activeThumbRef : undefined}
                  data-slide-thumb={slide.id}
                  onClick={() => selectSlide(slide)}
                  aria-label={`Select slide ${index + 1}`}
                  className={cn(
                    "relative h-16 shrink-0 overflow-hidden rounded-[8px] border-2 transition",
                    draft.aspectRatio === "16:9" ? "w-24" : draft.aspectRatio === "1:1" ? "w-16" : "w-10",
                    index === activeIndex
                      ? "border-primary ring-1 ring-primary/25"
                      : "border-transparent opacity-55 hover:opacity-100",
                  )}
                >
                  <VisualTile
                    visualKey={slide.visualKey}
                    imageUrl={slideCoverImage(slide)}
                    className="absolute inset-0"
                  />
                  <span className="absolute bottom-0 right-0 rounded-tl-md bg-black/60 px-1.5 py-0.5 pf-data text-[11px] font-semibold tabular-nums text-white">
                    {index + 1}
                  </span>
                </button>
              ))}
              <span className="mx-1.5 h-7 w-px shrink-0 bg-[var(--pf-active)]" />
              <button
                type="button"
                onClick={() => moveSlide(-1)}
                disabled={activeIndex === 0}
                aria-label="Move slide earlier"
                className={ICON_BTN}
              >
                <ArrowLeft className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveSlide(1)}
                disabled={activeIndex === draft.slides.length - 1}
                aria-label="Move slide later"
                className={ICON_BTN}
              >
                <ArrowRight className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={duplicateSlide}
                disabled={draft.slides.length >= MAX_SLIDESHOW_SLIDES}
                aria-label="Duplicate slide"
                className={ICON_BTN}
              >
                <Copy className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={deleteSlide}
                disabled={draft.slides.length <= 1}
                aria-label="Delete slide"
                className={cn(ICON_BTN, "hover:bg-destructive/10 hover:text-destructive")}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        </section>
  );
}
