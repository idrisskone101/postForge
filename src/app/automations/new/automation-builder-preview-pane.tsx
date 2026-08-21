"use client";

import { ImageIcon, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampPreviewZoom,
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
  PREVIEW_ZOOM_STEP,
} from "./automation-builder-preview";
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
    <div className="flex min-w-0 flex-col bg-[var(--pf-active)]">
      <div className="flex h-12 items-center justify-between border-b border-[var(--pf-border)] bg-white px-4">
        <div>
          <b className="mt-0.5 block text-[11px]">
            Slide {previewSlide + 1} of {record.content.slideCount}
          </b>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground" aria-label="Preview zoom controls">
          <button
            type="button"
            onClick={() => setPreviewZoom((current) => clampPreviewZoom(current - PREVIEW_ZOOM_STEP))}
            disabled={previewZoom === PREVIEW_ZOOM_MIN}
            aria-label="Zoom preview out"
            className="grid size-6 place-items-center rounded-lg border border-border bg-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Minus className="size-3" />
          </button>
          <output aria-live="polite" className="w-9 text-center tabular-nums">
            {previewZoom}%
          </output>
          <button
            type="button"
            onClick={() => setPreviewZoom((current) => clampPreviewZoom(current + PREVIEW_ZOOM_STEP))}
            disabled={previewZoom === PREVIEW_ZOOM_MAX}
            aria-label="Zoom preview in"
            className="grid size-6 place-items-center rounded-lg border border-border bg-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>
      <div className="grid min-h-[610px] flex-1 place-items-center overflow-auto bg-[#09090B] p-5">
        <div
          style={{ width: `${Math.round((320 * previewZoom) / 58)}px` }}
          className="relative aspect-[9/16] shrink-0 overflow-hidden rounded-lg border-[6px] border-white bg-[#09090B] shadow-[0_22px_52px_rgba(34,35,31,.19)] transition-[width] duration-150 motion-reduce:transition-none"
        >
          <div className="absolute inset-0 grid place-items-center bg-[var(--pf-active)] p-8 text-center text-muted-foreground">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-white">
                <ImageIcon className="size-5" />
              </span>
              <b className="mt-3 block text-[12px] text-foreground">No real media preview</b>
              <p className="mt-1 text-[12px] leading-3">{previewEmptyCopy}</p>
            </div>
          </div>
          {previewAsset && <AutomationPreviewMedia asset={previewAsset} className="absolute inset-0 size-full object-cover" />}
          {previewAsset && <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />}
          {previewAsset && (
            <span className="absolute left-3 top-3 z-20 max-w-[calc(100%-24px)] truncate rounded-full bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">
              {previewAsset.origin} · {previewAsset.name}
            </span>
          )}
          <div
            className={cn(
              "absolute inset-x-5 z-20 min-w-0 break-words text-center [overflow-wrap:anywhere]",
              previewAsset ? "text-white drop-shadow-md" : "bottom-8 rounded-lg bg-white/95 p-3 text-foreground shadow-sm",
              previewAsset &&
                (previewSlide === record.content.slideCount - 1
                  ? "bottom-10 rounded-lg bg-black/55 p-3"
                  : previewSlide === 0
                    ? "top-14"
                    : "top-[44%]")
            )}
          >
            <span className="block text-[13px] font-semibold uppercase tracking-[.09em]">
              {previewSlide === 0
                ? record.hook.strategy
                : previewSlide === record.content.slideCount - 1
                  ? "Keep this for later"
                  : `Point ${previewSlide}`}
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
      <div className="flex h-24 gap-2 overflow-x-auto border-t border-[var(--pf-border)] bg-white p-3">
        {Array.from({ length: record.content.slideCount }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setPreviewSlide(index)}
            aria-label={`Preview slide ${index + 1}`}
            aria-pressed={previewSlide === index}
            className={cn(
              "relative aspect-[9/16] h-16 shrink-0 overflow-hidden rounded-lg border-2 bg-[var(--pf-active)]",
              previewSlide === index ? "border-[var(--pf-orange)]" : "border-transparent"
            )}
          >
            {previewAsset?.kind === "image" ? (
              <AutomationPreviewMedia asset={previewAsset} className="size-full object-cover" />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-muted-foreground">
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
          className="flex aspect-[9/16] h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--pf-border-strong)] text-muted-foreground"
        >
          <Plus className="size-3" />
          <span className="text-[11px]">Add</span>
        </button>
      </div>
    </div>
  );
}
