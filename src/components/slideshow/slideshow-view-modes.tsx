"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  LayoutGrid,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { MAX_SLIDESHOW_SLIDES } from "./model";
import { SlidePreview } from "./slide-preview";
import {
  phaseLabel,
  SLIDESHOW_PLAY_INTERVAL_MS,
  stepSlideIndex,
  type SlideshowViewMode,
} from "./slideshow-view";
import { useSlideshowEditor } from "./slideshow-editor-provider";

export function SlideshowViewSwitcher({
  value,
  onChange,
}: {
  value: SlideshowViewMode;
  onChange: (mode: SlideshowViewMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Slideshow view"
      className="flex h-9 shrink-0 items-center gap-0.5 rounded-lg bg-[var(--pf-active)] p-1"
    >
      {VIEW_OPTIONS.map(({ id, label, icon: Icon }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            data-slideshow-view-tab={id}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-all duration-[180ms] ease-[var(--pf-ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/30",
              selected
                ? "bg-card text-foreground shadow-[var(--pf-shadow-2xs)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            <span className={cn(id === "board" ? "hidden sm:inline" : undefined)}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const ICON_BTN =
  "grid size-8 shrink-0 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-[var(--pf-active)] hover:text-foreground active:scale-[0.95] disabled:opacity-35 disabled:hover:bg-transparent";

const VIEW_OPTIONS: Array<{
  id: SlideshowViewMode;
  label: string;
  icon: typeof Pencil;
}> = [
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "board", label: "All slides", icon: LayoutGrid },
  { id: "play", label: "Play", icon: Play },
];

export function SlideshowBoardView() {
  const {
    draft: project,
    selectedSlideId,
    selectSlide: onSelect,
    addSlide: onAdd,
    duplicateSlide: onDuplicate,
    deleteSlide: onDelete,
    moveSlide: onMove,
    changeViewMode,
  } = useSlideshowEditor();
  const activeIndex = Math.max(
    0,
    project.slides.findIndex((slide) => slide.id === selectedSlideId),
  );
  const atMin = project.slides.length <= 1;
  const atMax = project.slides.length >= MAX_SLIDESHOW_SLIDES;

  return (
    <section
      aria-label="Slideshow storyboard"
      data-slideshow-view="board"
      className="flex min-h-0 flex-1 flex-col bg-[var(--pf-canvas)]"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
          {project.slides.map((slide, index) => {
            const selected = slide.id === selectedSlideId;
            return (
              <button
                key={slide.id}
                type="button"
                data-slide-board-card={slide.id}
                aria-pressed={selected}
                aria-label={`${phaseLabel(slide.kind)} slide ${index + 1}: ${slide.headline || "Untitled slide"}`}
                onClick={() => onSelect(slide)}
                onDoubleClick={() => {
                  onSelect(slide);
                  changeViewMode("edit");
                }}
                className={cn(
                  "group relative min-w-0 rounded-lg border bg-card p-2 text-left shadow-[var(--pf-shadow-2xs)] transition-all duration-[180ms] ease-[var(--pf-ease)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/30",
                  selected
                    ? "border-primary ring-1 ring-primary/25"
                    : "border-border hover:border-[var(--pf-border-strong)] hover:shadow-[var(--pf-shadow-md)]",
                )}
              >
                <SlidePreview
                  slide={slide}
                  aspectRatio={project.aspectRatio}
                  phaseSettings={project.phaseSettings[slide.kind]}
                  textSettings={project.textSettings}
                  className="w-full rounded-lg"
                />
                <span className="mt-2 flex items-center justify-between gap-2 px-0.5">
                  <span className="truncate text-[12px] font-semibold text-foreground">
                    {phaseLabel(slide.kind)}
                  </span>
                  <span className="pf-data shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {index + 1}/{project.slides.length}
                  </span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onAdd}
            disabled={atMax}
            aria-label="Add slide"
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--pf-border-strong)] bg-card px-4 text-center text-[13px] font-semibold text-muted-foreground transition hover:border-[var(--pf-orange)] hover:text-[var(--pf-orange)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-4" />
            Add slide
          </button>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-card px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4">
        <div className="mx-auto flex w-full max-w-[1240px] items-center gap-1.5 overflow-x-auto">
          <p className="mr-2 hidden min-w-0 truncate text-[12px] text-muted-foreground sm:block">
            {phaseLabel(project.slides[activeIndex]?.kind ?? "hook")} · slide{" "}
            {activeIndex + 1}
          </p>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={activeIndex === 0}
            aria-label="Move slide earlier"
            className={ICON_BTN}
          >
            <ArrowLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={activeIndex === project.slides.length - 1}
            aria-label="Move slide later"
            className={ICON_BTN}
          >
            <ArrowRight className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            disabled={atMax}
            aria-label="Duplicate slide"
            className={ICON_BTN}
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={atMin}
            aria-label="Delete slide"
            className={cn(ICON_BTN, "hover:bg-destructive/10 hover:text-destructive")}
          >
            <Trash2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const slide = project.slides[activeIndex];
              if (slide) {
                onSelect(slide);
                changeViewMode("edit");
              }
            }}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[13px] font-semibold text-foreground shadow-[var(--pf-shadow-2xs)] transition hover:border-[var(--pf-border-strong)]"
          >
            <Pencil className="size-3.5" />
            Edit slide
          </button>
        </div>
      </div>
    </section>
  );
}

export function SlideshowPlayView() {
  const { draft: project, selectedSlideId, selectSlide: onSelect } = useSlideshowEditor();
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
      className="flex min-h-0 flex-1 flex-col bg-[#09090B]"
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
      <div className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-hidden px-4 py-6 sm:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-4 top-4 z-20 flex gap-1 sm:inset-x-8"
        >
          {project.slides.map((slide, index) => (
            <span
              key={slide.id}
              className="h-0.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25"
            >
              <span
                className="block h-full bg-white transition-[width] duration-75"
                style={{
                  width:
                    index < activeIndex
                      ? "100%"
                      : index === activeIndex
                        ? `${Math.round(progress * 100)}%`
                        : "0%",
                }}
              />
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous slide"
          className="absolute left-3 z-20 grid size-10 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:left-5"
        >
          <ArrowLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next slide"
          className="absolute right-3 z-20 grid size-10 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:right-5"
        >
          <ArrowRight className="size-4" />
        </button>

        <div
          className={cn(
            "w-full max-w-[min(86vw,420px)]",
            project.aspectRatio === "16:9" && "max-w-[min(92vw,720px)]",
            project.aspectRatio === "1:1" && "max-w-[min(80vw,520px)]",
          )}
        >
          <SlidePreview
            slide={activeSlide}
            aspectRatio={project.aspectRatio}
            phaseSettings={project.phaseSettings[activeSlide.kind]}
            textSettings={project.textSettings}
            showCounter
            counter={`${activeIndex + 1}/${project.slides.length}`}
            className="w-full rounded-lg border-[6px] border-white shadow-[0_24px_56px_rgba(0,0,0,0.45)]"
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-3">
          <button
            type="button"
            data-slideshow-play-toggle=""
            onClick={() => setPlaying((current) => !current)}
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-zinc-950 transition hover:bg-white/90"
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {playing ? "Pause" : "Play"}
          </button>
          <p
            aria-live="polite"
            className="text-[12px] font-medium text-white/70"
          >
            {phaseLabel(activeSlide.kind)} · {activeIndex + 1} of{" "}
            {project.slides.length}
          </p>
          <p className="ml-auto hidden text-[12px] text-white/45 sm:block">
            Space plays · arrows step
          </p>
        </div>
      </div>
    </section>
  );
}
