"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  Cloud,
  Copy,
  Download,
  Grid2X2,
  Image as ImageIcon,
  Images,
  LoaderCircle,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  TextCursorInput,
  Trash2,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  addSlideshowSlide,
  deleteSlideshowSlide,
  duplicateSlideshowSlide,
  MAX_SLIDESHOW_SLIDES,
  moveSlideshowSlide,
  setSlideshowCta,
  updateSlideshowSlide,
} from "./model";
import { SlidePreview, VisualTile } from "./slide-preview";
import type {
  SlideshowAspectRatio,
  SlideshowGrid,
  SlideshowCollection,
  SlideshowImageGenerationResult,
  SlideshowPhase,
  SlideshowProject,
  SlideshowSlide,
  SlideshowTextAlign,
  SlideshowTextPosition,
  SlideshowTextSettings,
  SlideshowTextStyle,
} from "./types";
import { isLocalSlideshowId } from "./types";

type SaveState = "unsaved" | "saving" | "saved" | "error";

export interface SlideshowEditorProps {
  project: SlideshowProject;
  onBack: () => void;
  onProjectChange: (project: SlideshowProject) => void;
  onSaveProject: (
    project: SlideshowProject,
  ) => Promise<SlideshowProject | void>;
  onRegenerateSlide: (
    project: SlideshowProject,
    slide: SlideshowSlide,
  ) => Promise<SlideshowProject | Partial<SlideshowSlide> | void>;
  onRegenerateImage: (
    project: SlideshowProject,
    slide: SlideshowSlide,
    onQueuedRevision: (revision: number) => void,
  ) => Promise<SlideshowImageGenerationResult | void>;
  collections: SlideshowCollection[];
  onOpenImages: () => void;
  onPublish: (project: SlideshowProject) => void;
}

function NativeSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-2 block text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-xs font-medium text-foreground outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option === "none" ? "None" : option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </span>
    </label>
  );
}

function AutosaveStatus({ state }: { state: SaveState }) {
  const contents = {
    unsaved: {
      icon: Cloud,
      label: "Unsaved changes",
      className: "text-amber-600 dark:text-amber-300",
    },
    saving: {
      icon: LoaderCircle,
      label: "Saving…",
      className: "text-accent-blue",
    },
    saved: {
      icon: Check,
      label: "All changes saved",
      className: "text-accent-green",
    },
    error: {
      icon: Cloud,
      label: "Save failed",
      className: "text-destructive",
    },
  }[state];
  const Icon = contents.icon;

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] font-medium",
        contents.className,
      )}
    >
      <Icon className={cn("size-3.5", state === "saving" && "animate-spin")} />
      {contents.label}
    </span>
  );
}

function mergeSavedIdentity(
  current: SlideshowProject,
  saved: SlideshowProject,
  snapshot: SlideshowProject,
): SlideshowProject {
  const savedById = new Map(saved.slides.map((slide) => [slide.id, slide]));
  const savedByClientId = new Map(
    saved.slides
      .filter((slide) => slide.clientId)
      .map((slide) => [slide.clientId as string, slide]),
  );
  const snapshotIds = new Set(snapshot.slides.map((slide) => slide.id));

  return {
    ...current,
    id: saved.id,
    clientId: current.clientId ?? saved.clientId ?? snapshot.id,
    revision: saved.revision,
    createdAt: saved.createdAt ?? current.createdAt,
    updatedAt: saved.updatedAt,
    slides: current.slides.map((slide) => {
      const serverSlide =
        savedById.get(slide.id) ??
        savedByClientId.get(slide.id) ??
        (slide.clientId ? savedByClientId.get(slide.clientId) : undefined);

      if (!serverSlide || !snapshotIds.has(slide.id)) return slide;
      return {
        ...slide,
        id: serverSlide.id,
        clientId: slide.clientId ?? serverSlide.clientId ?? slide.id,
      };
    }),
  };
}

function sliderNumber(value: number | readonly number[], fallback: number) {
  return typeof value === "number" ? value : (value[0] ?? fallback);
}

export function SlideshowEditor({
  project,
  onBack,
  onProjectChange,
  onSaveProject,
  onRegenerateSlide,
  onRegenerateImage,
  collections,
  onOpenImages,
  onPublish,
}: SlideshowEditorProps) {
  const [draft, setDraft] = useState(project);
  const [selectedSlideId, setSelectedSlideId] = useState(
    project.slides[0]?.id ?? "",
  );
  const [advanced, setAdvanced] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>(
    isLocalSlideshowId(project.id) ? "unsaved" : "saved",
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [autosaveTick, setAutosaveTick] = useState(
    isLocalSlideshowId(project.id) ? 1 : 0,
  );

  const draftRef = useRef(draft);
  const selectedSlideIdRef = useRef(selectedSlideId);
  const editVersionRef = useRef(isLocalSlideshowId(project.id) ? 1 : 0);
  const savedVersionRef = useRef(0);
  const inFlightSaveRef = useRef<Promise<void> | null>(null);
  const pendingSaveRef = useRef(false);

  const setSelection = useCallback((id: string) => {
    selectedSlideIdRef.current = id;
    setSelectedSlideId(id);
  }, []);

  const activeIndex = Math.max(
    0,
    draft.slides.findIndex((slide) => slide.id === selectedSlideId),
  );
  const activeSlide = draft.slides[activeIndex] ?? draft.slides[0];
  const activePhase = activeSlide?.role ?? "hook";
  const phaseSettings = draft.phaseSettings[activePhase];

  const applyProject = useCallback(
    (next: SlideshowProject) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      draftRef.current = stamped;
      setDraft(stamped);
      editVersionRef.current += 1;
      setAutosaveTick(editVersionRef.current);
      setSaveState("unsaved");
      setSaveError(null);
      onProjectChange(stamped);
    },
    [onProjectChange],
  );

  const updateProject = useCallback(
    (update: (current: SlideshowProject) => SlideshowProject) => {
      const current = draftRef.current;
      const next = update(current);
      if (next !== current) applyProject(next);
    },
    [applyProject],
  );

  const flushSave = useCallback(async (): Promise<SlideshowProject> => {
    if (inFlightSaveRef.current) {
      pendingSaveRef.current = true;
      await inFlightSaveRef.current;
      if (savedVersionRef.current < editVersionRef.current) {
        return flushSave();
      }
      return draftRef.current;
    }

    const task = (async () => {
      do {
        pendingSaveRef.current = false;
        const snapshot = draftRef.current;
        const versionAtStart = editVersionRef.current;
        setSaveState("saving");
        setSaveError(null);

        try {
          const saved = await onSaveProject(snapshot);
          const hasNewerEdits = editVersionRef.current !== versionAtStart;
          const next = saved
            ? hasNewerEdits
              ? mergeSavedIdentity(draftRef.current, saved, snapshot)
              : saved
            : draftRef.current;
          if (saved) {
            const selectedBefore = selectedSlideIdRef.current;
            const selectedAfter =
              next.slides.find((slide) => slide.id === selectedBefore)?.id ??
              next.slides.find((slide) => slide.clientId === selectedBefore)?.id ??
              (!hasNewerEdits
                ? saved.slides[
                    Math.max(
                      0,
                      snapshot.slides.findIndex(
                        (slide) => slide.id === selectedBefore,
                      ),
                    )
                  ]?.id
                : undefined);
            if (selectedAfter) setSelection(selectedAfter);
          }
          draftRef.current = next;
          setDraft(next);
          savedVersionRef.current = versionAtStart;
          onProjectChange(next);

          if (!hasNewerEdits) setSaveState("saved");
          if (hasNewerEdits) pendingSaveRef.current = true;
        } catch (error) {
          setSaveState("error");
          setSaveError(
            error instanceof Error ? error.message : "Could not save this draft.",
          );
          throw error;
        }
      } while (pendingSaveRef.current);
    })();

    inFlightSaveRef.current = task;
    try {
      await task;
    } finally {
      inFlightSaveRef.current = null;
    }
    return draftRef.current;
  }, [onProjectChange, onSaveProject, setSelection]);

  useEffect(() => {
    if (autosaveTick <= savedVersionRef.current) return;
    const timeout = window.setTimeout(() => {
      void flushSave().catch(() => undefined);
    }, 750);
    return () => window.clearTimeout(timeout);
  }, [autosaveTick, flushSave]);

  const selectSlide = useCallback((slide: SlideshowSlide) => {
    setSelection(slide.id);
  }, [setSelection]);

  const selectPhase = (phase: SlideshowPhase) => {
    const match = draft.slides.find((slide) => slide.role === phase);
    if (match) {
      selectSlide(match);
      return;
    }
    if (phase === "cta") {
      const next = setSlideshowCta(draft, true);
      applyProject(next);
      setSelection(next.slides.at(-1)?.id ?? next.slides[0]?.id ?? "");
    }
  };

  const addSlide = () => {
    const next = addSlideshowSlide(draft, activeIndex);
    if (next === draft) return;
    const added = next.slides.find(
      (slide) => !draft.slides.some((current) => current.id === slide.id),
    );
    applyProject(next);
    if (added) setSelection(added.id);
  };

  const duplicateSlide = () => {
    const next = duplicateSlideshowSlide(draft, activeIndex);
    if (next === draft) return;
    const added = next.slides.find(
      (slide) => !draft.slides.some((current) => current.id === slide.id),
    );
    applyProject(next);
    if (added) setSelection(added.id);
  };

  const deleteSlide = () => {
    const next = deleteSlideshowSlide(draft, activeIndex);
    if (next === draft) return;
    const nextIndex = Math.min(activeIndex, next.slides.length - 1);
    applyProject(next);
    setSelection(next.slides[nextIndex]?.id ?? "");
  };

  const moveSlide = (direction: -1 | 1) => {
    const toIndex = activeIndex + direction;
    const next = moveSlideshowSlide(draft, activeIndex, toIndex);
    if (next !== draft) applyProject(next);
  };

  const updateActiveSlide = (patch: Partial<SlideshowSlide>) => {
    if (!activeSlide) return;
    updateProject((current) =>
      updateSlideshowSlide(current, activeSlide.id, patch),
    );
  };

  const updateTextSettings = (patch: Partial<SlideshowTextSettings>) => {
    updateProject((current) => ({
      ...current,
      textSettings: { ...current.textSettings, ...patch },
    }));
  };

  const updatePhaseSettings = (
    patch: Partial<(typeof draft.phaseSettings)[SlideshowPhase]>,
  ) => {
    updateProject((current) => ({
      ...current,
      phaseSettings: {
        ...current.phaseSettings,
        [activePhase]: { ...current.phaseSettings[activePhase], ...patch },
      },
    }));
  };

  const handleRegenerate = async () => {
    if (!activeSlide || regenerating) return;
    setRegenerating(true);
    setSaveError(null);
    try {
      const result = await onRegenerateSlide(draftRef.current, activeSlide);
      if (!result) return;
      if ("slides" in result) {
        applyProject(result);
        const matching = result.slides[activeIndex];
        if (matching) setSelection(matching.id);
      } else {
        updateActiveSlide(result);
      }
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not regenerate this slide.",
      );
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!activeSlide || regeneratingImage) return;
    setRegeneratingImage(true);
    setSaveError(null);
    try {
      const saved = await flushSave();
      const savedSlide =
        saved.slides.find((slide) => slide.id === selectedSlideIdRef.current) ??
        saved.slides[activeIndex];
      if (!savedSlide) return;
      const result = await onRegenerateImage(
        saved,
        savedSlide,
        (projectRevision) => {
          const current = draftRef.current;
          const revised = { ...current, revision: projectRevision };
          draftRef.current = revised;
          setDraft(revised);
          onProjectChange(revised);
        },
      );
      if (!result) return;
      // Let any autosave that raced the background attachment settle first.
      // A stale save may fail with a revision conflict; applying the server's
      // completion revision below then schedules a clean retry with local edits.
      if (inFlightSaveRef.current) {
        await inFlightSaveRef.current.catch(() => undefined);
      }
      const { projectRevision } = result;
      const slidePatch: Partial<SlideshowSlide> = {
        ...(result.imageUrl !== undefined
          ? {
              imageUrl: result.imageUrl,
              // A newly generated visual becomes the active source. A user can
              // deliberately apply a collection again afterward.
              imageUrls: [],
            }
          : {}),
        ...(result.imageUrls !== undefined ? { imageUrls: result.imageUrls } : {}),
        ...(result.visualKey !== undefined ? { visualKey: result.visualKey } : {}),
        ...(result.visualKeys !== undefined ? { visualKeys: result.visualKeys } : {}),
      };
      const current = draftRef.current;
      const target =
        current.slides.find((slide) => slide.id === savedSlide.id) ??
        current.slides.find((slide) => slide.clientId === savedSlide.clientId);
      if (!target) return;
      const next = updateSlideshowSlide(
        {
          ...current,
          revision: Math.max(current.revision ?? 0, projectRevision ?? 0),
        },
        target.id,
        slidePatch,
      );
      applyProject(next);
      setSelection(target.id);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not regenerate this slide image.",
      );
    } finally {
      setRegeneratingImage(false);
    }
  };

  const applyCollection = (collectionId: string) => {
    const collection = collections.find((item) => item.id === collectionId);
    if (!collection || !activeSlide) return;
    const required =
      phaseSettings.grid === "1:3"
        ? 3
        : phaseSettings.grid === "2:2"
          ? 4
          : phaseSettings.grid === "none"
            ? 1
            : 2;
    updateActiveSlide({
      visualKey: collection.visualKeys[0] ?? activeSlide.visualKey,
      visualKeys: collection.visualKeys.slice(0, required),
      imageUrls: collection.imageUrls?.slice(0, required),
    });
  };

  const handlePublish = async () => {
    try {
      const saved = await flushSave();
      onPublish(saved);
    } catch {
      // The autosave status already carries the actionable error.
    }
  };

  const handleBack = async () => {
    try {
      await flushSave();
      onBack();
    } catch {
      // Keep the editor open so the visible save error can be resolved or retried.
    }
  };

  const previewIndices = useMemo(() => {
    const result = [activeIndex - 1, activeIndex, activeIndex + 1].filter(
      (index) => index >= 0 && index < draft.slides.length,
    );
    return result;
  }, [activeIndex, draft.slides.length]);

  if (!activeSlide) return null;

  return (
    <div className="flex min-h-[calc(100vh-126px)] flex-col bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleBack()}
          disabled={saveState === "saving"}
        >
          <ChevronLeft />
          Back
        </Button>
        <span className="hidden h-5 w-px bg-border sm:block" />
        <input
          aria-label="Slideshow title"
          value={draft.title}
          onChange={(event) =>
            updateProject((current) => ({
              ...current,
              title: event.target.value,
            }))
          }
          className="h-8 min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold outline-none placeholder:text-muted-foreground sm:max-w-sm"
          placeholder="Untitled slideshow"
        />
        <AutosaveStatus state={saveState} />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenImages}>
            <Images />
            <span className="hidden sm:inline">Images</span>
          </Button>
          <Button
            size="sm"
            onClick={() => void handlePublish()}
            className="bg-accent-coral text-white hover:bg-[#ff6540]"
          >
            <Download />
            Publish / Export
          </Button>
        </div>
      </div>

      {saveError ? (
        <div
          role="alert"
          className="border-b border-destructive/20 bg-destructive/10 px-5 py-2 text-xs text-destructive"
        >
          {saveError} Changes remain in this browser; edit again to retry autosave.
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 xl:grid-cols-[250px_minmax(300px,1fr)_300px] 2xl:grid-cols-[292px_minmax(420px,1fr)_336px]">
        <aside className="border-b border-border bg-card xl:border-b-0 xl:border-r">
          <div className="grid grid-cols-3 border-b border-border">
            {(["hook", "body", "cta"] as SlideshowPhase[]).map((phase) => {
              const exists = draft.slides.some((slide) => slide.role === phase);
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => selectPhase(phase)}
                  className={cn(
                    "relative h-12 text-xs font-medium capitalize text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    activePhase === phase && "text-foreground",
                  )}
                >
                  {phase === "body" ? "Content" : phase.toUpperCase()}
                  {!exists && phase === "cta" ? " +" : ""}
                  {activePhase === phase ? (
                    <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-accent-coral" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="max-h-[620px] space-y-5 overflow-y-auto p-4 xl:max-h-[calc(100vh-240px)]">
            <button
              type="button"
              onClick={onOpenImages}
              className="flex w-full items-center gap-3 rounded-xl border border-accent-coral/30 bg-accent-coral/5 p-3 text-left transition hover:border-accent-coral/50 hover:bg-accent-coral/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral/30"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent-coral/10 text-accent-coral">
                <Images className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold">
                  Select {activePhase === "body" ? "content" : activePhase} images
                </span>
                <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                  Choose a collection or import a visual set
                </span>
              </span>
            </button>

            {collections.length ? (
              <label className="block">
                <span className="mb-2 block text-[10px] text-muted-foreground">
                  Apply collection to this slide
                </span>
                <select
                  defaultValue=""
                  onChange={(event) => {
                    applyCollection(event.target.value);
                    event.target.value = "";
                  }}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue"
                >
                  <option value="" disabled>
                    Choose a collection…
                  </option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} · {collection.imageCount} images
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <NativeSelect<SlideshowAspectRatio>
                label="Aspect ratio"
                value={draft.aspectRatio}
                options={["9:16", "4:5", "1:1", "16:9"]}
                onChange={(aspectRatio) =>
                  updateProject((current) => ({ ...current, aspectRatio }))
                }
              />
              <NativeSelect<SlideshowGrid>
                label="Image grid"
                value={phaseSettings.grid}
                options={["none", "1:2", "1:3", "2:1", "2:2"]}
                onChange={(grid) => updatePhaseSettings({ grid })}
              />
            </div>

            <div className="space-y-1 border-y border-border py-3">
              <label className="flex min-h-10 items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-foreground/75">
                  <Grid2X2 className="size-4 text-muted-foreground" />
                  Dark overlay
                </span>
                <Switch
                  aria-label="Toggle dark overlay"
                  checked={phaseSettings.overlayEnabled}
                  onCheckedChange={(checked) =>
                    updatePhaseSettings({ overlayEnabled: checked })
                  }
                />
              </label>
              {phaseSettings.overlayEnabled ? (
                <label className="block px-1 pb-3">
                  <span className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Overlay opacity</span>
                    <span>{phaseSettings.overlayOpacity}%</span>
                  </span>
                  <Slider
                    aria-label="Overlay opacity"
                    min={0}
                    max={100}
                    step={1}
                    value={[phaseSettings.overlayOpacity]}
                    onValueChange={(value) =>
                      updatePhaseSettings({
                        overlayOpacity: sliderNumber(value, 0),
                      })
                    }
                  />
                </label>
              ) : null}
              <label className="flex min-h-10 items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-foreground/75">
                  <TextCursorInput className="size-4 text-muted-foreground" />
                  Display text
                </span>
                <Switch
                  aria-label="Toggle display text"
                  checked={phaseSettings.displayText}
                  onCheckedChange={(checked) =>
                    updatePhaseSettings({ displayText: checked })
                  }
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => setAdvanced((current) => !current)}
              aria-expanded={advanced}
              className="flex h-10 w-full items-center justify-between text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="size-4" />
                Advanced
              </span>
              <ChevronDown
                className={cn("size-4 transition", advanced && "rotate-180")}
              />
            </button>

            {advanced ? (
              <div className="space-y-4 rounded-xl border border-border bg-muted/25 p-3">
                <label className="block">
                  <span className="mb-2 block text-[10px] text-muted-foreground">
                    Language
                  </span>
                  <input
                    value={draft.language}
                    onChange={(event) =>
                      updateProject((current) => ({
                        ...current,
                        language: event.target.value,
                      }))
                    }
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-xs text-foreground/75">
                  <span>Include CTA slide</span>
                  <Switch
                    checked={draft.includeCta}
                    onCheckedChange={(checked) => {
                      const next = setSlideshowCta(draftRef.current, checked);
                      applyProject(next);
                    }}
                    aria-label="Include CTA slide"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-xs text-foreground/75">
                  <span>Prevent repeated hooks</span>
                  <Switch
                    checked={draft.preventRepeats}
                    onCheckedChange={(preventRepeats) =>
                      updateProject((current) => ({
                        ...current,
                        preventRepeats,
                      }))
                    }
                    aria-label="Prevent repeated hooks"
                  />
                </label>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="min-w-0 overflow-hidden bg-muted/25">
          <div className="flex h-full min-h-[560px] flex-col">
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 sm:p-6">
              <div className="flex max-w-full items-center justify-center gap-3 overflow-hidden">
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
                        "min-w-0 shrink-0 rounded-[26px] outline-none transition-all focus-visible:ring-2 focus-visible:ring-accent-blue",
                        active
                          ? "w-[min(72vw,318px)] opacity-100 drop-shadow-2xl"
                          : "hidden w-[190px] opacity-35 hover:opacity-60 2xl:block",
                        draft.aspectRatio === "16:9" &&
                          (active ? "w-[min(80vw,520px)]" : "w-[280px]"),
                        draft.aspectRatio === "1:1" &&
                          (active ? "w-[min(72vw,410px)]" : "w-[220px]"),
                      )}
                    >
                      <SlidePreview
                        slide={slide}
                        aspectRatio={draft.aspectRatio}
                        phaseSettings={draft.phaseSettings[slide.role]}
                        textSettings={draft.textSettings}
                        showCounter
                        counter={`${index + 1}/${draft.slides.length}`}
                        className={cn(
                          "w-full border-2 shadow-2xl",
                          active
                            ? "border-accent-blue"
                            : "border-border shadow-black/20",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border bg-card px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={addSlide}
                  disabled={draft.slides.length >= MAX_SLIDESHOW_SLIDES}
                  aria-label="Add slide"
                  className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground transition hover:border-accent-coral hover:text-accent-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-coral/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="size-5" />
                </button>
                {draft.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => selectSlide(slide)}
                    aria-label={`Select slide ${index + 1}`}
                    className={cn(
                      "relative h-16 w-11 shrink-0 overflow-hidden rounded-lg border-2 outline-none transition",
                      activeIndex === index
                        ? "border-accent-blue opacity-100"
                        : "border-transparent opacity-55 hover:opacity-100",
                    )}
                  >
                    <VisualTile
                      visualKey={slide.visualKey}
                      className="h-full w-full"
                    />
                    <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[8px] font-medium text-white">
                      {index + 1}
                    </span>
                  </button>
                ))}
                <span className="mx-1 h-8 w-px shrink-0 bg-border" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveSlide(-1)}
                  disabled={activeIndex === 0}
                  aria-label="Move slide left"
                >
                  <ArrowLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveSlide(1)}
                  disabled={activeIndex === draft.slides.length - 1}
                  aria-label="Move slide right"
                >
                  <ArrowRight />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={duplicateSlide}
                  disabled={draft.slides.length >= MAX_SLIDESHOW_SLIDES}
                  aria-label="Duplicate slide"
                >
                  <Copy />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={deleteSlide}
                  disabled={draft.slides.length <= 1}
                  aria-label="Delete slide"
                >
                  <Trash2 />
                </Button>
                <span className="ml-auto hidden shrink-0 sm:block">
                  <AutosaveStatus state={saveState} />
                </span>
              </div>
            </div>
          </div>
        </main>

        <aside className="border-t border-border bg-card xl:border-l xl:border-t-0">
          <div className="max-h-[700px] space-y-5 overflow-y-auto p-5 xl:max-h-[calc(100vh-170px)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold">Text layers</p>
                <p className="mt-1 text-[10px] capitalize text-muted-foreground">
                  {activePhase === "body" ? "Content" : activePhase} · Slide {activeIndex + 1}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground">
                3 layers
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NativeSelect<SlideshowTextSettings["font"]>
                label="Font"
                value={draft.textSettings.font}
                options={["Poppins", "Inter", "Serif", "Mono", "Rounded"]}
                onChange={(font) => updateTextSettings({ font })}
              />
              <NativeSelect<SlideshowTextSettings["color"]>
                label="Color"
                value={draft.textSettings.color}
                options={["white", "black", "coral", "blue", "yellow", "custom"]}
                onChange={(color) => updateTextSettings({ color })}
              />
              <NativeSelect<SlideshowTextStyle>
                label="Style"
                value={draft.textSettings.style}
                options={["outline", "solid", "translucent", "plain"]}
                onChange={(style) => updateTextSettings({ style })}
              />
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Size</span>
                  <span>{draft.textSettings.size}px</span>
                </span>
                <span className="flex h-10 items-center rounded-lg border border-border bg-background px-3">
                  <Slider
                    min={14}
                    max={64}
                    step={1}
                    value={[draft.textSettings.size]}
                    onValueChange={(value) =>
                      updateTextSettings({ size: sliderNumber(value, 28) })
                    }
                    aria-label="Text size"
                  />
                </span>
              </label>
            </div>

            {draft.textSettings.color === "custom" ? (
              <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-3">
                <span>
                  <span className="block text-xs font-semibold">Custom text color</span>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    Choose any brand color.
                  </span>
                </span>
                <input
                  type="color"
                  value={draft.textSettings.customColor ?? "#ffffff"}
                  onChange={(event) =>
                    updateTextSettings({ customColor: event.target.value })
                  }
                  aria-label="Custom text color"
                  className="size-10 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
              </label>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <NativeSelect<SlideshowTextPosition>
                label="Position"
                value={draft.textSettings.position}
                options={["top", "center", "bottom"]}
                onChange={(position) => updateTextSettings({ position })}
              />
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Width</span>
                  <span>{draft.textSettings.width}%</span>
                </span>
                <span className="flex h-10 items-center rounded-lg border border-border bg-background px-3">
                  <Slider
                    min={50}
                    max={100}
                    step={1}
                    value={[draft.textSettings.width]}
                    onValueChange={(value) =>
                      updateTextSettings({ width: sliderNumber(value, 88) })
                    }
                    aria-label="Text width"
                  />
                </span>
              </label>
            </div>

            <div>
              <p className="mb-2 text-[10px] text-muted-foreground">Alignment</p>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                {(
                  [
                    ["left", AlignLeft],
                    ["center", AlignCenter],
                    ["right", AlignRight],
                  ] as const
                ).map(([align, Icon]) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() =>
                      updateTextSettings({ align: align as SlideshowTextAlign })
                    }
                    aria-label={`Align text ${align}`}
                    aria-pressed={draft.textSettings.align === align}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground",
                      draft.textSettings.align === align &&
                        "bg-background text-foreground shadow-sm",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-[10px] text-muted-foreground">
                Eyebrow
              </span>
              <input
                value={activeSlide.eyebrow}
                onChange={(event) =>
                  updateActiveSlide({ eyebrow: event.target.value })
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                <span>Headline</span>
                <span>{activeSlide.headline.length}/180</span>
              </span>
              <textarea
                value={activeSlide.headline}
                maxLength={180}
                onChange={(event) =>
                  updateActiveSlide({ headline: event.target.value })
                }
                className="min-h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-xs font-medium leading-5 outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                <span>Supporting copy</span>
                <span>{activeSlide.body.length}/420</span>
              </span>
              <textarea
                value={activeSlide.body}
                maxLength={420}
                onChange={(event) => updateActiveSlide({ body: event.target.value })}
                className="min-h-20 w-full resize-none rounded-lg border border-border bg-background p-3 text-xs leading-5 outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[10px] text-muted-foreground">
                AI direction
              </span>
              <textarea
                value={activeSlide.prompt}
                onChange={(event) =>
                  updateActiveSlide({ prompt: event.target.value })
                }
                className="min-h-24 w-full resize-none rounded-lg border border-border bg-background p-3 text-xs leading-5 outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
              />
            </label>

            <div className="rounded-xl border border-accent-blue/20 bg-accent-blue/5 p-4">
              <div className="flex items-start gap-3">
                <WandSparkles className="mt-0.5 size-4 shrink-0 text-accent-blue" />
                <div>
                  <p className="text-xs font-semibold">AI copy variation</p>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                    Generate another version without changing the visual layout.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleRegenerate()}
                    disabled={regenerating}
                    className="mt-3 bg-accent-blue text-white hover:bg-accent-blue/85"
                  >
                    {regenerating ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}
                    {regenerating ? "Regenerating…" : "Regenerate text"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-accent-coral/20 bg-accent-coral/5 p-4">
              <div className="flex items-start gap-3">
                <ImageIcon className="mt-0.5 size-4 shrink-0 text-accent-coral" />
                <div>
                  <p className="text-xs font-semibold">AI image variation</p>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                    Generate a new visual from this slide&apos;s AI direction, then
                    attach the completed job output to the draft.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleRegenerateImage()}
                    disabled={regeneratingImage || saveState === "saving"}
                    className="mt-3 bg-accent-coral text-white hover:bg-[#ff6540]"
                  >
                    {regeneratingImage ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <ImageIcon />
                    )}
                    {regeneratingImage ? "Generating image…" : "Regenerate image"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3">
              <div>
                <p className="text-xs font-semibold">Slide count</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Reel-ready range: 1–{MAX_SLIDESHOW_SLIDES}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-border">
                <Sparkles className="size-3 text-accent-coral" />
                {draft.slides.length}/{MAX_SLIDESHOW_SLIDES}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
