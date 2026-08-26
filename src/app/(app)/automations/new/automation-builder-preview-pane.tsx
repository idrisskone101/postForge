"use client";

import { ImageIcon, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampPreviewZoom,
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
  PREVIEW_ZOOM_STEP,
} from "./automation-builder-preview";
import {
  previewOverlayPositionClass,
  previewSlideOverlayTitle,
} from "./automation-builder-preview-layout";
import { AutomationPreviewMedia } from "./automation-preview-media";
import type { AutomationBuilderWorkspace } from "./use-automation-builder";

export function AutomationBuilderPreviewPane({
  workspace,
}: {
  workspace: AutomationBuilderWorkspace;
}) {
  const {
    record,
    setRecord,
    previewSlide,
    setPreviewSlide,
    previewZoom,
    setPreviewZoom,
    previewAsset,
    previewEmptyCopy,
    slideCopy,
  } = workspace;

  return (
    <div
      data-automation-preview="true"
      className="hidden min-w-0 flex-col bg-[var(--pf-active)] lg:flex"
    >
      <div
        data-automation-preview-bar="true"
        className="flex h-12 items-center justify-between border-b border-[var(--pf-border)] bg-[var(--pf-surface)] px-4"
      >
        <div>
          <b className="mt-0.5 block text-[11px] text-[var(--pf-ink)]">
            Slide {previewSlide + 1} of {record.content.slideCount}
          </b>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-[var(--pf-muted)]" aria-label="Preview zoom controls">
          <button
            type="button"
            onClick={() => setPreviewZoom((current) => clampPreviewZoom(current - PREVIEW_ZOOM_STEP))}
            disabled={previewZoom === PREVIEW_ZOOM_MIN}
            aria-label="Zoom preview out"
            className="grid size-6 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Minus className="size-3" />
          </button>
          <output aria-live="polite" className="w-9 text-center tabular-nums text-[var(--pf-ink)]">
            {previewZoom}%
          </output>
          <button
            type="button"
            onClick={() => setPreviewZoom((current) => clampPreviewZoom(current + PREVIEW_ZOOM_STEP))}
            disabled={previewZoom === PREVIEW_ZOOM_MAX}
            aria-label="Zoom preview in"
            className="grid size-6 place-items-center rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-surface)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>
      <div
        data-automation-preview-stage="true"
        className="grid min-h-[610px] flex-1 place-items-center overflow-auto bg-[#09090B] p-5"
      >
        <div
          style={{ width: `${Math.round((320 * previewZoom) / 58)}px` }}
          className="relative aspect-[9/16] shrink-0 overflow-hidden rounded-[8px] border-[6px] border-[var(--pf-surface)] bg-[#09090B] shadow-[var(--pf-shadow-lg)] transition-[width] duration-150 motion-reduce:transition-none"
        >
          <div className="absolute inset-0 grid place-items-center bg-[var(--pf-active)] p-8 text-center text-[var(--pf-muted)]">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full border border-[var(--pf-border)] bg-[var(--pf-surface)]">
                <ImageIcon className="size-5 text-[var(--pf-muted)]" />
              </span>
              <b className="mt-3 block text-[12px] text-[var(--pf-ink)]">No real media preview</b>
              <p className="mt-1 text-[12px] leading-3 text-[var(--pf-muted)]">{previewEmptyCopy}</p>
            </div>
          </div>
          {previewAsset && (
            <AutomationPreviewMedia asset={previewAsset} className="absolute inset-0 size-full object-cover" />
          )}
          {previewAsset && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
          )}
          {previewAsset && (
            <span className="absolute left-3 top-3 z-20 max-w-[calc(100%-24px)] truncate rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
              {previewAsset.origin} · {previewAsset.name}
            </span>
          )}
          <div
            className={cn(
              "absolute inset-x-5 z-20 min-w-0 break-words text-center [overflow-wrap:anywhere]",
              previewOverlayPositionClass(Boolean(previewAsset), previewSlide, record.content.slideCount)
            )}
          >
            <span className="block text-[13px] font-semibold uppercase tracking-[.09em]">
              {previewSlideOverlayTitle({
                previewSlide,
                slideCount: record.content.slideCount,
                hookStrategy: record.hook.strategy,
              })}
            </span>
            <b className="mt-1 block min-w-0 break-words font-serif text-[20px] italic leading-tight [overflow-wrap:anywhere]">
              {slideCopy[Math.min(previewSlide, slideCopy.length - 1)]}
            </b>
          </div>
          <span className="absolute bottom-2 right-2 z-20 rounded-full bg-black/70 px-2 py-1 text-[12px] text-white">
            {previewSlide + 1} / {record.content.slideCount}
          </span>
        </div>
      </div>
      <div
        data-automation-preview-strip="true"
        className="flex h-24 gap-2 overflow-x-auto border-t border-[var(--pf-border)] bg-[var(--pf-surface)] p-3"
      >
        {Array.from({ length: record.content.slideCount }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setPreviewSlide(index)}
            aria-label={`Preview slide ${index + 1}`}
            aria-pressed={previewSlide === index}
            className={cn(
              "relative aspect-[9/16] h-16 shrink-0 overflow-hidden rounded-[8px] border-2 bg-[var(--pf-active)]",
              previewSlide === index ? "border-[var(--pf-orange)]" : "border-transparent"
            )}
          >
            {previewAsset?.kind === "image" ? (
              <AutomationPreviewMedia asset={previewAsset} className="size-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-[var(--pf-muted)]">
                <ImageIcon className="size-3" />
              </span>
            )}
            <span className="absolute bottom-1 right-1 grid size-3 place-items-center rounded-full bg-black/70 text-[11px] text-white">
              {index + 1}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            setRecord((current) => ({
              ...current,
              content: { ...current.content, slideCount: Math.min(9, current.content.slideCount + 1) },
            }))
          }
          className="flex aspect-[9/16] h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-[8px] border border-dashed border-[var(--pf-border-strong)] text-[var(--pf-muted)]"
        >
          <Plus className="size-3" />
          <span className="text-[11px]">Add</span>
        </button>
      </div>
    </div>
  );
}
