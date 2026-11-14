"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Pause, Play } from "lucide-react";

import { Button, Icon, IconButton, iconButtonClass } from "@/components/workbench";
import { cn } from "@/lib/utils";

import { EditorStageHead } from "./editor-stage-head";
import { MAX_SLIDESHOW_SLIDES } from "./model";
import { SlidePreview } from "./slide-preview";
import {
  phaseLabel,
  SLIDESHOW_PLAY_INTERVAL_MS,
  stepSlideIndex,
} from "./slideshow-view";
import { useSlideshowEditor } from "./slideshow-editor-provider";

export function SlideshowBoardView() {
  const {
    draft: project,
    selectedSlideId,
    viewMode,
    selectSlide: onSelect,
    addSlide: onAdd,
    duplicateSlide: onDuplicate,
    deleteSlide: onDelete,
    moveSlide: onMove,
    changeViewMode,
    updateProject,
  } = useSlideshowEditor();
  const activeIndex = Math.max(
    0,
    project.slides.findIndex((slide) => slide.id === selectedSlideId),
  );
  const atMin = project.slides.length <= 1;
  const atMax = project.slides.length >= MAX_SLIDESHOW_SLIDES;
  const openInEditor = (index: number) => {
    const slide = project.slides[index];
    if (!slide) return;
    onSelect(slide);
    changeViewMode("edit");
  };

  return (
    <section
      aria-label="Slideshow storyboard"
      data-slideshow-view="board"
      className={VIEW_PANEL}
    >
      <EditorStageHead
        viewMode={viewMode}
        aspectRatio={project.aspectRatio}
        onViewChange={changeViewMode}
        onAspectChange={(aspectRatio) =>
          updateProject((current) => ({ ...current, aspectRatio }))
        }
      />
      <div className="wb-scroll-fade-y wb-scroll-fade-deep -mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-1 pt-1">
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-3 gap-y-5 sm:grid-cols-[repeat(auto-fill,minmax(184px,1fr))]">
          {project.slides.map((slide, index) => {
            const selected = slide.id === selectedSlideId;
            return (
              <li key={slide.id} className="min-w-0">
                <button
                  type="button"
                  data-slide-board-card={slide.id}
                  aria-pressed={selected}
                  aria-label={`${phaseLabel(slide.kind)} slide ${index + 1}: ${slide.headline || "Untitled slide"}`}
                  onClick={() => onSelect(slide)}
                  onDoubleClick={() => openInEditor(index)}
                  className="group flex w-full min-w-0 flex-col gap-2 rounded-lg text-left"
                >
                  <SlidePreview
                    slide={slide}
                    aspectRatio={project.aspectRatio}
                    phaseSettings={project.phaseSettings[slide.kind]}
                    textSettings={project.textSettings}
                    className={cn(
                      "w-full rounded-lg transition-[box-shadow,transform] duration-160 ease-pf group-hover:-translate-y-1",
                      selected && "shadow-[0_0_0_2px_var(--pf-panel),0_0_0_4px_var(--pf-ember)]",
                    )}
                  />
                  <span className="flex items-center justify-between gap-2 px-0.5">
                    <span
                      className={cn(
                        "truncate text-[13px] font-semibold",
                        selected ? "text-ember-text" : "text-fg",
                      )}
                    >
                      {phaseLabel(slide.kind)}
                    </span>
                    <span className="wb-meta shrink-0 tabular-nums">
                      {index + 1} / {project.slides.length}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              onClick={onAdd}
              disabled={atMax}
              aria-label="Add slide"
              style={{ aspectRatio: project.aspectRatio.replace(":", " / ") }}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-edge text-[13px] font-semibold text-fg-secondary transition-colors duration-160 ease-pf hover:bg-raised hover:text-fg disabled:cursor-not-allowed disabled:text-fg-disabled disabled:hover:bg-transparent"
            >
              <Icon name="plus" size={18} />
              Add slide
            </button>
          </li>
        </ol>
      </div>

      <div className="wb-panel-foot flex-wrap justify-start gap-2">
        <p className="wb-meta mr-auto min-w-0 truncate">
          {phaseLabel(project.slides[activeIndex]?.kind ?? "hook")}, slide {activeIndex + 1}
        </p>
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={activeIndex === 0}
          aria-label="Move slide earlier"
          title="Move slide earlier"
          className={iconButtonClass("quiet", 30)}
        >
          <ArrowLeft strokeWidth={1.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={activeIndex === project.slides.length - 1}
          aria-label="Move slide later"
          title="Move slide later"
          className={iconButtonClass("quiet", 30)}
        >
          <ArrowRight strokeWidth={1.5} aria-hidden="true" />
        </button>
        <Button size={32} onClick={onDuplicate} disabled={atMax}>
          <Copy className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          Duplicate
        </Button>
        <Button variant="danger" size={32} onClick={onDelete} disabled={atMin}>
          Delete slide
        </Button>
        <Button variant="strong" size={32} onClick={() => openInEditor(activeIndex)}>
          <Icon name="pencil" size={14} />
          Edit slide
        </Button>
      </div>
    </section>
  );
}

export function SlideshowPlayView() {
  const {
    draft: project,
    selectedSlideId,
    viewMode,
    selectSlide: onSelect,
    changeViewMode,
  } = useSlideshowEditor();
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const activeIndex = Math.max(
    0,
    project.slides.findIndex((slide) => slide.id === selectedSlideId),
  );
  const activeSlide = project.slides[activeIndex] ?? project.slides[0];

  const goTo = (index: number) => {
    const slide = project.slides[index];
    if (!slide) return;
    setProgress(0);
    onSelect(slide);
  };

  const step = (delta: -1 | 1) => {
    goTo(stepSlideIndex(activeIndex, delta, project.slides.length, true));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " && event.code !== "Space") return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }
      event.preventDefault();
      setPlaying((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!playing || !activeSlide) return;
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(1, elapsed / SLIDESHOW_PLAY_INTERVAL_MS));
      if (elapsed >= SLIDESHOW_PLAY_INTERVAL_MS) {
        const nextIndex = stepSlideIndex(
          activeIndex,
          1,
          project.slides.length,
          true,
        );
        const next = project.slides[nextIndex];
        if (next) onSelect(next);
        setProgress(0);
      }
    }, 50);
    return () => window.clearInterval(tick);
  }, [activeIndex, activeSlide, onSelect, playing, project.slides]);

  if (!activeSlide) return null;

  return (
    <section
      aria-label="Slideshow playback"
      data-slideshow-view="play"
      className={cn(VIEW_PANEL, "xl:min-h-[760px]")}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start == null) return;
        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (delta > 48) step(-1);
        if (delta < -48) step(1);
      }}
    >
      <EditorStageHead viewMode={viewMode} onViewChange={changeViewMode} />
      <div className="relative flex min-h-[460px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#09090B] px-3 pb-6 pt-10 sm:gap-5 xl:min-h-[640px]">
        <div aria-hidden="true" className="absolute inset-x-4 top-4 flex gap-1">
          {project.slides.map((slide, index) => (
            <span
              key={slide.id}
              className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20"
            >
              <span
                className={cn(
                  "block h-full origin-left transition-transform duration-75 ease-linear",
                  index === activeIndex ? "bg-ember" : "bg-white/85",
                )}
                style={{ transform: `scaleX(${barFill(index, activeIndex, progress)})` }}
              />
            </span>
          ))}
        </div>
        <IconButton icon="chevron-left" label="Previous slide" className="size-9" onClick={() => step(-1)} />
        <div
          className="min-w-0 shrink"
          style={{ width: playSlideWidth(project.aspectRatio) }}
        >
          <SlidePreview
            slide={activeSlide}
            aspectRatio={project.aspectRatio}
            phaseSettings={project.phaseSettings[activeSlide.kind]}
            textSettings={project.textSettings}
            className="w-full rounded-lg"
          />
        </div>
        <IconButton icon="chevron-right" label="Next slide" className="size-9" onClick={() => step(1)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="strong"
          data-slideshow-play-toggle=""
          onClick={() => setPlaying((current) => !current)}
          aria-label={playing ? "Pause slideshow" : "Play slideshow"}
          className="min-w-[96px]"
        >
          {playing ? (
            <Pause className="size-4" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Play className="size-4" strokeWidth={1.5} aria-hidden="true" />
          )}
          {playing ? "Pause" : "Play"}
        </Button>
        <p aria-live="polite" className="text-[13px] font-semibold text-fg">
          {phaseLabel(activeSlide.kind)}, {activeIndex + 1} of {project.slides.length}
        </p>
        <p className="wb-meta ml-auto max-sm:hidden">Space plays, arrows step</p>
      </div>
    </section>
  );
}

function barFill(index: number, activeIndex: number, progress: number) {
  if (index < activeIndex) return 1;
  return index === activeIndex ? progress : 0;
}

function playSlideWidth(aspectRatio: string) {
  const [w, h] = aspectRatio.split(":").map(Number);
  return `min(100%, ${Math.round((600 * w) / h)}px)`;
}

export { SlideshowViewSwitcher } from "./editor-stage-head";

const VIEW_PANEL = "wb-panel wb-fade-in min-h-0 xl:h-[calc(100dvh-100px)] xl:min-h-[728px]";
