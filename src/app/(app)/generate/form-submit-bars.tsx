"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import type { GenerateFormModel } from "./form-types";
import type { GenerateFormViewModel } from "./form-view-model";

export function GenerateFormSubmitBars({
  form,
  view,
  desktopBarClassName,
}: {
  form: GenerateFormModel;
  view: GenerateFormViewModel;
  desktopBarClassName: string;
}) {
  const {
    aspectRatio,
    numImages,
    duration = 5,
    isSubmitting,
    submitError = null,
    notice = null,
    swapReady = true,
    swapSourceDurationSec,
    avatarName,
    vibeRequirement = null,
  } = form;
  const {
    model,
    isImage,
    isVideo,
    isSwap,
    canSubmit,
    missing,
    estimatedCost,
    variationCount,
  } = view;

  return (
    <>
      <div className="flex min-h-[72px] items-center gap-2 overflow-x-auto border-t border-border px-3 py-2.5">
        {Array.from({ length: Math.max(1, variationCount) }, (_, index) => (
          <div
            key={index}
            className={cn(
              "relative grid h-12 w-10 shrink-0 place-items-center rounded-lg border bg-[var(--pf-canvas)] text-[13px] font-semibold text-muted-foreground",
              index === 0 ? "border-[var(--pf-orange)]" : "border-border"
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </div>
        ))}
        <span className="ml-1 text-[12px] leading-4 text-muted-foreground">
          {variationCount} output{variationCount === 1 ? "" : "s"} will be added to
          the editor.
        </span>
      </div>

      {(submitError || notice) && (
        <div
          role={submitError ? "alert" : "status"}
          className={cn(
            "mx-3 mt-3 flex min-w-0 items-start gap-2 rounded-lg px-3 py-2.5 text-[12px] leading-4",
            !submitError && "animate-success-pulse",
            submitError
              ? "bg-[var(--pf-danger)]/10 text-[var(--pf-danger)]"
              : "bg-[var(--pf-link)]/10 text-[var(--pf-link)]"
          )}
        >
          {submitError ? (
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          )}
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            {submitError ?? notice}
          </span>
        </div>
      )}

      <div className={desktopBarClassName}>
        <div className="min-w-0">
          <span className="block truncate text-[12px] text-muted-foreground">
            {model
              ? isSwap
                ? `${model.name} · subject swap · ${swapSourceDurationSec ? `${Math.round(swapSourceDurationSec)}s source` : "source video"}`
                : `${model.name} · ${aspectRatio} · ${isImage ? `${numImages} output${numImages === 1 ? "" : "s"}` : `${duration}s video`}${avatarName ? ` · ${avatarName}` : ""}`
              : "Select a model and describe your asset"}
          </span>
          <strong className="mt-1 block text-[13px] font-semibold text-foreground">
            Cost Estimate · {model ? formatCost(estimatedCost) : "—"}
          </strong>
          {isVideo && avatarName === "Character identity" && (
            <span className="mt-0.5 block text-[12px] text-muted-foreground">
              Includes one identity-locked opening frame
            </span>
          )}
          {missing.length > 0 && (
            <span className="mt-0.5 block text-[12px] text-[var(--pf-lamp-amber)]">
              {isSwap && !swapReady
                ? model?.id === "pixverse-swap"
                  ? "Add a source video and a swap reference to continue"
                  : "Add a source video to continue"
                : `Add ${missing.join(" and ")} to continue`}
            </span>
          )}
          {vibeRequirement && (
            <span className="mt-0.5 block text-[12px] text-[var(--pf-lamp-amber)]">
              {vibeRequirement}
            </span>
          )}
        </div>
        <Button
          type="submit"
          aria-label="Generate Now"
          disabled={!canSubmit}
          className="pf-button-primary h-11 min-w-[174px] px-5 text-[13px] shadow-[var(--pf-shadow-orange)]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Generating…
            </>
          ) : (
            <>
              {isSwap ? "Swap subject" : `Generate ${isVideo ? "video" : "image"}`}
              <ArrowRight className="ml-2 size-3.5" />
            </>
          )}
        </Button>
      </div>

      <div className="fixed inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-lg border border-border bg-card/95 p-2.5 shadow-[var(--pf-shadow-lg)] backdrop-blur-md md:hidden">
        <div className="min-w-0 flex-1 pl-1">
          <span className="block truncate text-[12px] text-muted-foreground">
            {model
              ? isSwap
                ? `${model.name} · subject swap${swapSourceDurationSec ? ` · ${Math.round(swapSourceDurationSec)}s source` : ""}`
                : `${model.name} · ${aspectRatio}`
              : "Choose a model"}
          </span>
          <strong className="mt-0.5 block text-[12px] text-foreground">
            {model ? formatCost(estimatedCost) : "—"}
          </strong>
          {missing.length > 0 && (
            <span className="mt-0.5 block truncate text-[12px] text-[var(--pf-lamp-amber)]">
              {isSwap && !swapReady
                ? model?.id === "pixverse-swap"
                  ? "Add a source video and a swap reference"
                  : "Add a source video"
                : `Add ${missing.join(" and ")} to continue`}
            </span>
          )}
          {vibeRequirement && (
            <span className="mt-0.5 block truncate text-[12px] text-[var(--pf-lamp-amber)]">
              {vibeRequirement}
            </span>
          )}
        </div>
        <Button
          type="submit"
          aria-label="Generate Now on mobile"
          disabled={!canSubmit}
          className="pf-button-primary h-10 px-4 text-[12px]"
        >
          {isSubmitting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ArrowRight className="size-3.5" />
          )}
          {isSubmitting ? "Generating…" : isSwap ? "Swap subject" : `Generate ${isVideo ? "video" : "image"}`}
        </Button>
      </div>
    </>
  );
}
