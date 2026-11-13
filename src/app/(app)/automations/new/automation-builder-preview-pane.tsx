"use client";

import { IconButton } from "@/components/workbench";
import {
  clampPreviewZoom,
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
  PREVIEW_ZOOM_STEP,
} from "./automation-builder-preview";
import { previewSlideOverlayTitle } from "./automation-builder-preview-layout";
import { AutomationBuilderPlanSettings } from "./automation-builder-plan-settings";
import { AutomationPreviewMedia } from "./automation-preview-media";
import type { AutomationBuilderWorkspace } from "./use-automation-builder";

export function AutomationBuilderPreviewPane({
  workspace,
}: {
  workspace: AutomationBuilderWorkspace;
}) {
  const {
    record,
    previewSlide,
    setPreviewSlide,
    previewZoom,
    setPreviewZoom,
    previewAsset,
    previewEmptyCopy,
    slideCopy,
  } = workspace;
  const slideCount = record.content.slideCount;

  return (
    <div data-automation-preview="true" className="flex min-w-0 shrink-0 flex-col gap-3 xl:w-[372px]">
      <section
        aria-labelledby="builder-preview-title"
        className="flex min-h-[380px] flex-1 flex-col gap-3 rounded-xl bg-panel p-5 shadow-panel"
      >
        <div className="flex items-center gap-2.5">
          <h2 id="builder-preview-title" className="wb-panel-title min-w-0 flex-1">
            Preview
          </h2>
          <span className="wb-mono text-fg-secondary" aria-live="polite">
            {previewSlide + 1} / {slideCount}
          </span>
          <IconButton
            icon="chevron-left"
            size={30}
            label="Previous slide"
            disabled={previewSlide === 0}
            onClick={() => setPreviewSlide((current) => current - 1)}
          />
          <IconButton
            icon="chevron-right"
            size={30}
            label="Next slide"
            disabled={previewSlide >= slideCount - 1}
            onClick={() => setPreviewSlide((current) => current + 1)}
          />
        </div>
        <div
          data-automation-preview-stage="true"
          className="wb-well relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-3.5"
        >
          <div
            style={{ width: `${Math.round((160 * previewZoom) / 58)}px` }}
            className="relative flex aspect-[160/284] shrink-0 flex-col justify-end overflow-hidden rounded-lg bg-media"
          >
            {previewAsset && (
              <AutomationPreviewMedia asset={previewAsset} className="absolute inset-0 size-full object-cover" />
            )}
            {previewAsset && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent from-35% to-[var(--pf-scrim)]" />
            )}
            <div className={previewAsset ? "relative p-3.5 text-[var(--pf-on-media)]" : "relative p-3.5 text-fg"}>
              <span className="block text-[12px] font-semibold leading-4 opacity-80">
                {previewSlideOverlayTitle({
                  previewSlide,
                  slideCount,
                  hookStrategy: record.hook.strategy,
                })}
              </span>
              <b className="block min-w-0 break-words text-[15px] font-bold leading-[19px] [overflow-wrap:anywhere]">
                {slideCopy[Math.min(previewSlide, slideCopy.length - 1)]}
              </b>
            </div>
          </div>
          <div
            className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full bg-raised p-0.5"
            role="group"
            aria-label="Preview zoom controls"
          >
            <ZoomButton
              label="Zoom preview out"
              sign="-"
              disabled={previewZoom === PREVIEW_ZOOM_MIN}
              onClick={() => setPreviewZoom((current) => clampPreviewZoom(current - PREVIEW_ZOOM_STEP))}
            />
            <output aria-live="polite" className="wb-mono w-9 text-center text-fg-secondary">
              {previewZoom}%
            </output>
            <ZoomButton
              label="Zoom preview in"
              sign="+"
              disabled={previewZoom === PREVIEW_ZOOM_MAX}
              onClick={() => setPreviewZoom((current) => clampPreviewZoom(current + PREVIEW_ZOOM_STEP))}
            />
          </div>
        </div>
        <p className="wb-meta min-w-0 break-words [overflow-wrap:anywhere]">
          {previewAsset ? `${previewAsset.origin}: ${previewAsset.name}` : previewEmptyCopy}
        </p>
      </section>
      <AutomationBuilderPlanSettings workspace={workspace} />
    </div>
  );
}

function ZoomButton({
  label,
  sign,
  disabled,
  onClick,
}: {
  label: string;
  sign: "+" | "-";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-full text-[15px] font-semibold leading-none text-fg transition-colors duration-[var(--pf-dur-feedback)] ease-pf hover:bg-raised-strong disabled:text-fg-disabled"
    >
      {sign === "+" ? "+" : "−"}
    </button>
  );
}
