"use client";

import {
  ChevronDown,
  Images,
  LoaderCircle,
  Plus,
  WandSparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { CreatorSlideImageSlot } from "./creator-image-slot";
import {
  CARD,
  FIELD_LABEL,
  INPUT,
  MAX_CREATOR_SLIDES,
  StepChip,
} from "./studio-ui";
import type { CreatorDraft } from "./view-models";

export function CreatorCopyForm({ draft }: { draft: CreatorDraft }) {
  const {
    title,
    onTitleChange,
    hook,
    onHookChange,
    hookImageAssetId,
    onClearHookImage,
    slideLines,
    slideImageAssetIds,
    onUpdateLine,
    onAddSlideLine,
    onRemoveSlideLine,
    onClearSlideImage,
    onOpenImagePicker,
    aspectRatio,
    onAspectRatioChange,
    imageModels,
    selectedImageModel,
    onSelectImageModel,
    needsGeneration,
    generating,
    error,
    onSubmit,
  } = draft;
  return (
      <section className={cn(CARD, "p-5")} aria-label="Bring your own copy">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-[var(--pf-orange)]/10 text-[var(--pf-orange)]">
            <WandSparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="pf-section-title">Your copy, your visuals</h2>
            <p className="text-[13px] leading-[1.35] text-muted-foreground">
              Keep copy verbatim. Attach a collection image to any slide, or generate the rest.
            </p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className={cn(FIELD_LABEL)}>Slideshow title</span>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Untitled slideshow"
            className={cn(INPUT, "h-9")}
          />
        </label>

        <div className="mt-3">
          <span className={cn(FIELD_LABEL)}>Hook</span>
          <div className="mt-1 flex items-start gap-2">
            <CreatorSlideImageSlot
              assetId={hookImageAssetId}
              label="hook"
              onPick={() => onOpenImagePicker({ kind: "hook" })}
              onClear={onClearHookImage}
            />
            <textarea
              value={hook}
              onChange={(event) => onHookChange(event.target.value)}
              rows={2}
              placeholder="The tension-led opening that earns the next swipe"
              className={cn(INPUT, "resize-none py-2.5 leading-5")}
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className={cn(FIELD_LABEL)}>Slide text</span>
            <button
              type="button"
              onClick={onAddSlideLine}
              disabled={slideLines.length >= MAX_CREATOR_SLIDES}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-[var(--pf-orange)] transition hover:bg-[var(--pf-orange)]/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus className="size-3" /> Add slide
            </button>
          </div>
          <p className="mb-1 text-[11px] text-muted-foreground">
            Optional: attach a collection image. Empty slots are generated.
          </p>
          {slideLines.length >= MAX_CREATOR_SLIDES ? (
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              Maximum {MAX_CREATOR_SLIDES} slides per slideshow.
            </p>
          ) : null}
          <div className="mt-2 space-y-2">
            {slideLines.map((line, index) => (
              <div key={index}>
                <div className="flex items-start gap-2">
                  <span className="mt-2.5 grid size-6 shrink-0 place-items-center rounded-md bg-[var(--pf-active)] font-mono text-[10px] font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <CreatorSlideImageSlot
                    assetId={slideImageAssetIds[index] ?? null}
                    label={`slide ${index + 1}`}
                    onPick={() => onOpenImagePicker({ kind: "slide", index })}
                    onClear={() => onClearSlideImage(index)}
                  />
                  <textarea
                    value={line}
                    onChange={(event) => onUpdateLine(index, event.target.value)}
                    rows={1}
                    placeholder={`Text for slide ${index + 1}`}
                    className={cn(INPUT, "min-h-9 resize-y py-2 leading-4")}
                  />
                  {slideLines.length > 1 ? (
                    <button
                      type="button"
                      aria-label="Remove slide"
                      onClick={() => onRemoveSlideLine(index)}
                      className="mt-2 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-[var(--pf-danger)]/10 hover:text-[var(--pf-danger)]"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                {slideImageAssetIds[index] && !line.trim() ? (
                  <p className="mt-1 pl-20 text-[11px] text-muted-foreground">
                    Add copy to keep this image on the slideshow.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className={cn("mt-4 grid gap-2", needsGeneration ? "sm:grid-cols-2" : "")}>
          <label className="block">
            <span className={cn(FIELD_LABEL)}>Aspect ratio</span>
            <span className="relative">
              <select
                value={aspectRatio}
                onChange={(event) =>
                  onAspectRatioChange(event.target.value as "9:16" | "4:5" | "1:1" | "16:9")
                }
                className="h-9 w-full appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-[11px] font-medium outline-none focus:border-[var(--pf-orange)]"
              >
                {["9:16", "4:5", "1:1", "16:9"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            </span>
          </label>
          {needsGeneration ? (
            <label className="block">
              <span className={cn(FIELD_LABEL)}>Image model</span>
              <span className="relative">
                <select
                  value={selectedImageModel ?? "gpt-image-2"}
                  onChange={(event) => onSelectImageModel?.(event.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-border bg-card pl-2.5 pr-7 text-[11px] font-medium outline-none focus:border-[var(--pf-orange)]"
                >
                  {((imageModels && imageModels.length ? imageModels : [{ id: "gpt-image-2", name: "GPT Image 2" }]) as Array<{ id: string; name: string }>).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              </span>
            </label>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={generating || !hook.trim()}
            className="pf-button-primary ml-auto h-10 px-5"
          >
            {generating ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : needsGeneration ? (
              <WandSparkles className="size-3.5" />
            ) : (
              <Images className="size-3.5" />
            )}
            {generating
              ? "Creating slideshow..."
              : needsGeneration
                ? "Create & generate visuals"
                : "Create slideshow"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4">
          {[
            ["01", "Your copy stays exactly as written"],
            ["02", "Attach a collection image to any slide"],
            [
              "03",
              needsGeneration
                ? "The JSON template styles every remaining slide"
                : "Every slide is covered, so nothing is generated",
            ],
          ].map(([n, label]) => (
            <span key={n} className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <StepChip n={n} />
              {label}
            </span>
          ))}
        </div>
      </section>
  );
}
