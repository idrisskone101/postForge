"use client";

import {
  ChevronDown,
  Grid2X2,
  Images,
  Settings2,
  TextCursorInput,
} from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { NativeSelect, sliderNumber } from "./editor-controls";
import { setSlideshowCta } from "./model";
import { phaseLabel } from "./slideshow-view";
import { FIELD_LABEL, INPUT } from "./studio-ui";
import type {
  SlideshowAspectRatio,
  SlideshowGrid,
  SlideshowSlideKind,
} from "./types";
import type { SlideshowEditorWorkspace } from "./view-models";

export function EditorSlideRail({
  workspace,
}: {
  workspace: SlideshowEditorWorkspace;
}) {
  const {
    draft,
    activePhase,
    collections,
    phaseSettings,
    advanced,
    imageModels,
    selectedImageModel,
    selectPhase,
    applyCollection,
    updateProject,
    updatePhaseSettings,
    setPickerOpen,
    setAdvanced,
    onSelectImageModel,
  } = workspace;
  return (
        <aside className="border-b border-border bg-white xl:border-b-0 xl:border-r">
          <div className="grid grid-cols-3 border-b border-border p-2">
            {(["hook", "content", "cta"] as SlideshowSlideKind[]).map((phase) => {
              const exists = draft.slides.some((slide) => slide.kind === phase);
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
                  {phaseLabel(phase)}
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
                  Select {phaseLabel(activePhase).toLowerCase()} images
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
                    onCheckedChange={(checked) =>
                      updateProject((current) => setSlideshowCta(current, checked))
                    }
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
  );
}
