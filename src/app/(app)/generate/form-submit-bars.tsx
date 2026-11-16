"use client";

import { Icon } from "@/components/workbench";
import { publishPinnedBar } from "@/lib/pinned-bar";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { GENERATE_LAYOUT } from "./form-constants";
import type { GenerateFormModel } from "./form-types";
import type { GenerateFormViewModel } from "./form-view-model";

/** Preview panel: the output frame, real validation and cost state, and the one primary action. */
export function GenerateFormSubmitBars({
  form,
  view,
  className,
}: {
  form: GenerateFormModel;
  view: GenerateFormViewModel;
  className?: string;
}) {
  const { aspectRatio, isSubmitting, submitError = null, notice = null } = form;
  const { model, isSwap, isVideo, canSubmit, estimatedCost } = view;
  const [ratioWidth, ratioHeight] = aspectRatio.split(":").map(Number);
  const frameWidth =
    ratioWidth > 0 && ratioHeight > 0
      ? Math.round((PREVIEW_HEIGHT * ratioWidth) / ratioHeight)
      : PREVIEW_HEIGHT;
  const requirement = requirementCopy(form, view);

  return (
    <aside
      ref={publishPinnedBar}
      aria-label="Preview"
      className={cn("wb-panel gap-3 p-5 max-xl:px-3 max-xl:pt-3 max-xl:shadow-float", GENERATE_LAYOUT.aside, className)}
    >
      <h2 className="wb-panel-title max-xl:sr-only">Preview</h2>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-well p-5 max-xl:hidden">
        <div
          role="img"
          aria-label={`${aspectRatio} output frame, nothing generated yet`}
          className="flex max-h-full max-w-full flex-col items-center justify-center gap-2.5 rounded-lg bg-panel p-6 shadow-[inset_0_0_0_1px_var(--pf-hairline)]"
          style={{ aspectRatio: `${ratioWidth || 1} / ${ratioHeight || 1}`, width: `${frameWidth}px` }}
        >
          <Icon name="gallery" size={28} className="shrink-0 text-fg-muted" />
          <span className="text-center text-[14px] font-semibold leading-5 text-fg">
            Nothing generated yet
          </span>
        </div>
      </div>

      {submitError ? (
        <p role="alert" className="wb-notice wb-fade-in [overflow-wrap:anywhere]" data-tone="bad">
          {submitError}
        </p>
      ) : notice ? (
        <p role="status" className="wb-notice wb-fade-in [overflow-wrap:anywhere]">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 max-xl:px-2">
        {requirement ? (
          <p className="text-[13px] leading-[18px] text-warn">{requirement}</p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] leading-[18px] text-fg-muted">
            Estimated cost
          </span>
          <span className="shrink-0 font-mono text-[13px] leading-[18px] text-fg">
            {model ? formatCost(estimatedCost) : "-"}
          </span>
        </div>
        {isVideo && form.avatarName === "Character identity" ? (
          <p className="text-[12px] leading-4 text-fg-muted">
            Includes one identity-locked opening frame
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        aria-busy={isSubmitting}
        className="wb-btn wb-btn-primary wb-btn-block h-12 max-h-12 flex-none gap-2 text-[15px] leading-5 [&>svg]:size-[18px]"
      >
        <Icon name="generate" strokeWidth={1.8} />
        {isSubmitting ? "Generating" : isSwap ? "Swap subject" : "Generate now"}
      </button>
    </aside>
  );
}

function requirementCopy(form: GenerateFormModel, view: GenerateFormViewModel) {
  const { swapReady = true, vibeRequirement = null } = form;
  if (view.isSwap && !swapReady) {
    return view.model?.id === "pixverse-swap"
      ? "Add a source video and a swap reference to continue"
      : "Add a source video to continue";
  }
  if (view.missing.length > 0) return `Add ${view.missing.join(" and ")} to continue`;
  return vibeRequirement;
}

const PREVIEW_HEIGHT = 420;
