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
  Images,
  Layers,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { platformCollectionAssetUrl } from "@/lib/collections-client";
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
  onPublish: (project: SlideshowProject) => void;
  imageModels?: Array<{ id: string; name: string }>;
  selectedImageModel?: string | null;
  onSelectImageModel?: (modelId: string) => void;
}

const SECONDARY_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] font-semibold text-muted-foreground shadow-[var(--pf-shadow-2xs)] transition-all duration-150 hover:border-[var(--pf-border-strong)] hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45";
const ICON_BTN =
  "grid size-8 shrink-0 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-[var(--pf-active)] hover:text-foreground active:scale-[0.95] disabled:opacity-35 disabled:hover:bg-transparent";
const INPUT =
  "w-full rounded-lg border border-border bg-card px-3 text-[12px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10";
const FIELD_LABEL = "mb-1.5 block text-[12px] font-semibold text-muted-foreground";

function NativeSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  optionLabel,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  className?: string;
  optionLabel?: (value: T) => string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className={FIELD_LABEL}>{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="h-9 w-full appearance-none rounded-lg border border-border bg-card px-2.5 pr-7 text-[11px] font-medium capitalize text-foreground outline-none transition focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabel?.(option) ?? (option === "none" ? "None" : option)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
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
      label: "Saving...",
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
        "inline-flex items-center gap-1.5 text-[12px] font-semibold",
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
  onPublish,
  imageModels = [],
  selectedImageModel = null,
  onSelectImageModel,
}: SlideshowEditorProps) {
  const [draft, setDraft] = useState(project);
  const [selectedSlideId, setSelectedSlideId] = useState(
    project.slides[0]?.id ?? "",
  );
  const [advanced, setAdvanced] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAssetIds, setPickerAssetIds] = useState<string[]>([]);
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

  const applyPickedAssets = () => {
    if (!activeSlide || !pickerAssetIds.length) {
      setPickerOpen(false);
      return;
    }
    const required =
      phaseSettings.grid === "1:3"
        ? 3
        : phaseSettings.grid === "2:2"
          ? 4
          : phaseSettings.grid === "none"
            ? 1
            : 2;
    updateActiveSlide({
      imageUrls: pickerAssetIds.slice(0, required).map(platformCollectionAssetUrl),
    });
    setPickerOpen(false);
    setPickerAssetIds([]);
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
    <div className="flex min-h-full flex-col bg-[var(--pf-canvas)]">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => void handleBack()}
          disabled={saveState === "saving"}
          className={SECONDARY_BTN}
        >
          <ChevronLeft className="size-3.5" />
          Drafts
        </button>
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
          className="h-8 min-w-0 flex-1 bg-transparent px-1 text-[15px] font-semibold tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground sm:max-w-sm"
          placeholder="Untitled slideshow"
        />
        <AutosaveStatus state={saveState} />
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className={SECONDARY_BTN} onClick={() => setPickerOpen(true)}>
            <Images className="size-3.5" />
            <span className="hidden sm:inline">Images</span>
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            className="pf-button-primary"
          >
            <Download className="size-3.5" />
            Publish / Export
          </button>
        </div>
      </header>

      {saveError ? (
        <div
          role="alert"
          className="border-b border-destructive/20 bg-destructive/10 px-5 py-2 text-[11px] text-destructive"
        >
          {saveError.includes("imagePrompt")
            ? "AI direction is too long to save. Shorten it to 2,000 characters or fewer."
            : saveError} Changes remain only in this browser until autosave succeeds; leaving now can lose them.
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 xl:grid-cols-[264px_minmax(300px,1fr)_304px]">
        <aside className="border-b border-border bg-white xl:border-b-0 xl:border-r">
          <div className="grid grid-cols-3 border-b border-border p-2">
            {(["hook", "body", "cta"] as SlideshowPhase[]).map((phase) => {
              const exists = draft.slides.some((slide) => slide.role === phase);
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => selectPhase(phase)}
                  className={cn(
                    "relative flex h-9 items-center justify-center rounded-[8px] text-[13px] font-semibold capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pf-orange)]/30",
                    activePhase === phase
                      ? "bg-[var(--pf-active)] text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {phase === "body" ? "Content" : phase}
                  {!exists && phase === "cta" ? " +" : ""}
                </button>
              );
            })}
          </div>

          <div className="max-h-[620px] space-y-5 overflow-y-auto p-4 xl:max-h-[calc(100vh-240px)]">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="flex w-full items-center gap-3 rounded-[6px] border border-[var(--pf-orange)]/25 bg-[var(--pf-orange)]/[0.05] p-3 text-left transition hover:border-[var(--pf-orange)]/45 hover:bg-[var(--pf-orange)]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]/30"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--pf-orange)]/10 text-[var(--pf-orange)]">
                <Images className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-foreground">
                  Select {activePhase === "body" ? "content" : activePhase} images
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                  Pick from the shared Collections library
                </span>
              </span>
            </button>

            {collections.length ? (
              <label className="block">
                <span className={FIELD_LABEL}>Apply collection to this slide</span>
                <span className="relative block">
                  <select
                    defaultValue=""
                    onChange={(event) => {
                      applyCollection(event.target.value);
                      event.target.value = "";
                    }}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-card px-2.5 pr-7 text-[11px] font-medium text-foreground outline-none focus:border-[var(--pf-orange)]"
                  >
                    <option value="" disabled>
                      Choose a collection...
                    </option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name} · {collection.imageCount} images
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                </span>
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

            <div className="space-y-3 border-y border-border py-3.5">
              <label className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-medium text-foreground">
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
                <label className="block px-0.5 pb-1">
                  <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                    <span>Overlay opacity</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {phaseSettings.overlayOpacity}%
                    </span>
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
              <label className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[12px] font-medium text-foreground">
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
              className="flex h-9 w-full items-center justify-between text-[12px] font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="size-4" />
                Advanced
              </span>
              <ChevronDown
                className={cn("size-4 transition-transform", advanced && "rotate-180")}
              />
            </button>

            {advanced ? (
              <div className="space-y-4 rounded-[6px] border border-border bg-[var(--pf-active)] p-3.5">
                <label className="block">
                  <span className={FIELD_LABEL}>Image model</span>
                  {imageModels.length > 0 ? (
                    <select
                      value={selectedImageModel ?? ""}
                      onChange={(event) =>
                        onSelectImageModel?.(event.target.value)
                      }
                      className={cn(INPUT, "h-8 text-[11px]")}
                    >
                      {imageModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="block rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground">
                      Using the workspace default image model.
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className={FIELD_LABEL}>Language</span>
                  <input
                    value={draft.language}
                    onChange={(event) =>
                      updateProject((current) => ({
                        ...current,
                        language: event.target.value,
                      }))
                    }
                    className={cn(INPUT, "h-8 text-[11px]")}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 text-[12px] font-medium text-foreground">
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
                <label className="flex items-center justify-between gap-3 text-[12px] font-medium text-foreground">
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
                        : "hidden w-[168px] opacity-40 hover:opacity-70 xl:block",
                      draft.aspectRatio === "16:9" &&
                        (active ? "w-[min(80vw,520px)]" : "w-[280px]"),
                      draft.aspectRatio === "1:1" &&
                        (active ? "w-[min(58vw,380px)]" : "w-[200px]"),
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
                <span className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-[13px] font-semibold text-foreground shadow-lg">
                  <LoaderCircle className="size-3.5 animate-spin text-[var(--pf-orange)]" />
                  Rendering slide visual...
                </span>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-border bg-white px-3 py-2.5">
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
                  onClick={() => selectSlide(slide)}
                  aria-label={`Select slide ${index + 1}`}
                  className={cn(
                    "relative h-14 w-9 shrink-0 overflow-hidden rounded-[8px] border-2 transition",
                    index === activeIndex
                      ? "border-[var(--pf-ink)]"
                      : "border-transparent opacity-55 hover:opacity-100",
                  )}
                >
                  <VisualTile
                    visualKey={slide.visualKey}
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
              <span className="ml-auto hidden shrink-0 sm:block">
                <AutosaveStatus state={saveState} />
              </span>
            </div>
          </div>
        </section>

        <aside className="border-t border-border bg-white xl:border-l xl:border-t-0">
          <div className="max-h-[700px] space-y-5 overflow-y-auto p-4 xl:max-h-[calc(100vh-170px)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-foreground">Text layers</p>
                <p className="mt-0.5 text-[12px] capitalize text-muted-foreground">
                  {activePhase === "body" ? "Content" : activePhase} · slide {activeIndex + 1}
                </p>
              </div>
              <span className="rounded-full bg-[var(--pf-active)] px-2 py-[3px] text-[12px] font-bold text-muted-foreground">
                3 layers
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NativeSelect<SlideshowTextSettings["font"]>
                label="Font"
                value={draft.textSettings.font}
                options={[
                  "Poppins",
                  "Serif",
                  "SerifItalic",
                  "Editorial",
                  "Condensed",
                  "Inter",
                  "Mono",
                  "Rounded",
                ]}
                optionLabel={(font) =>
                  ({
                    Poppins: "Default",
                    Serif: "Serif",
                    SerifItalic: "Serif italic",
                    Editorial: "Serif italic 2",
                    Condensed: "Condensed bold",
                    Inter: "Inter",
                    Mono: "Mono",
                    Rounded: "Rounded",
                  })[font]
                }
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
                options={["plain", "outline", "solid", "light", "translucent"]}
                optionLabel={(style) =>
                  ({
                    plain: "Text shadow",
                    outline: "Outline",
                    solid: "Background",
                    light: "Light BG",
                    translucent: "Translucent",
                  })[style]
                }
                onChange={(style) => updateTextSettings({ style })}
              />
              <NativeSelect<SlideshowTextPosition>
                label="Position"
                value={draft.textSettings.position}
                options={["top", "center", "bottom"]}
                onChange={(position) => updateTextSettings({ position })}
              />
              <NativeSelect<SlideshowTextSettings["padding"]>
                label="Top / bottom padding"
                value={draft.textSettings.padding}
                options={["padded", "flush"]}
                onChange={(padding) => updateTextSettings({ padding })}
              />
            </div>

            <div>
              <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                <span>Text size</span>
                <span className="font-mono tabular-nums text-muted-foreground">{draft.textSettings.size}px</span>
              </span>
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
            </div>

            <div>
              <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                <span>Text width</span>
                <span className="font-mono tabular-nums text-muted-foreground">{draft.textSettings.width}%</span>
              </span>
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
            </div>

            {draft.textSettings.style === "solid" ||
            draft.textSettings.style === "light" ? (
              <div>
                <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                  <span>Background radius</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {draft.textSettings.backgroundRadius}px
                  </span>
                </span>
                <Slider
                  min={0}
                  max={20}
                  step={1}
                  value={[draft.textSettings.backgroundRadius]}
                  onValueChange={(value) =>
                    updateTextSettings({
                      backgroundRadius: sliderNumber(value, 4),
                    })
                  }
                  aria-label="Background radius"
                />
              </div>
            ) : null}

            {draft.textSettings.color === "custom" ? (
              <label className="flex items-center justify-between gap-4 rounded-[6px] border border-border bg-card p-3">
                <span>
                  <span className="block text-[12px] font-semibold text-foreground">Custom text color</span>
                  <span className="mt-0.5 block text-[12px] text-muted-foreground">
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

            <div>
              <span className={FIELD_LABEL}>Alignment</span>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--pf-active)] p-1">
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
                      "flex h-7 items-center justify-center rounded-lg transition",
                      draft.textSettings.align === align
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className={FIELD_LABEL}>Eyebrow</span>
              <input
                value={activeSlide.eyebrow}
                onChange={(event) =>
                  updateActiveSlide({ eyebrow: event.target.value })
                }
                className={cn(INPUT, "h-9")}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                <span>Headline</span>
                <span className="font-mono tabular-nums">{activeSlide.headline.length}/180</span>
              </span>
              <textarea
                value={activeSlide.headline}
                maxLength={180}
                rows={2}
                onChange={(event) =>
                  updateActiveSlide({ headline: event.target.value })
                }
                className={cn(INPUT, "resize-none py-2 font-medium leading-5")}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-[12px] font-semibold text-muted-foreground">
                <span>Supporting copy</span>
                <span className="font-mono tabular-nums">{activeSlide.body.length}/420</span>
              </span>
              <textarea
                value={activeSlide.body}
                maxLength={420}
                rows={3}
                onChange={(event) => updateActiveSlide({ body: event.target.value })}
                className={cn(INPUT, "resize-none py-2 leading-5")}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>AI direction</span>
              <textarea
                value={activeSlide.prompt}
                rows={2}
                onChange={(event) =>
                  updateActiveSlide({ prompt: event.target.value })
                }
                className={cn(INPUT, "resize-none py-2 leading-5")}
              />
            </label>

            <div className="rounded-[6px] border border-accent-blue/20 bg-accent-blue/[0.05] p-3.5">
              <div className="flex items-start gap-2.5">
                <WandSparkles className="mt-0.5 size-4 shrink-0 text-accent-blue" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">AI copy variation</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
                    Rewrite this slide without changing the visual layout.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleRegenerate()}
                    disabled={regenerating}
                    className="mt-2.5 h-8 rounded-lg bg-accent-blue px-3 text-[13px] font-semibold text-white hover:brightness-105 active:scale-[0.97]"
                  >
                    {regenerating ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    {regenerating ? "Rewriting..." : "Regenerate text"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-[6px] border border-[var(--pf-orange)]/20 bg-[var(--pf-orange)]/[0.04] p-3.5">
              <div className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--pf-orange)]" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">AI image variation</p>
                  <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
                    Queue a new visual from the AI direction. One image job at $0.08.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleRegenerateImage()}
                    disabled={regeneratingImage || saveState === "saving"}
                    className="pf-button-primary mt-2.5 h-8 min-h-8"
                  >
                    {regeneratingImage ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    {regeneratingImage ? "Rendering..." : "Regenerate image"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[6px] border border-border bg-[var(--pf-active)] p-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground">Slide count</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Reel-ready range: 1-{MAX_SLIDESHOW_SLIDES}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[13px] font-semibold text-foreground shadow-sm ring-1 ring-border">
                <Layers className="size-3 text-[var(--pf-orange)]" />
                {draft.slides.length}/{MAX_SLIDESHOW_SLIDES}
              </span>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl! overflow-y-auto rounded-lg border-border">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              Select slide images
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              Pick images from the shared Collections library. The same collections feed Generate, Clone, and Automations.
            </DialogDescription>
          </DialogHeader>
          <CollectionReferencePicker
            selectedAssetIds={pickerAssetIds}
            onChange={setPickerAssetIds}
            maxSelection={4}
          />
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-[12px] text-muted-foreground">
              {pickerAssetIds.length} selected · applied to this slide
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className={SECONDARY_BTN}
                onClick={() => {
                  setPickerOpen(false);
                  setPickerAssetIds([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pf-button-primary"
                disabled={!pickerAssetIds.length}
                onClick={applyPickedAssets}
              >
                <Check className="size-3.5" />
                Apply to slide
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
