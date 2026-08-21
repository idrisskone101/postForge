import { SlidersHorizontal, Volume2, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import { calculateEstimatedCost } from "@/lib/ai/models";
import { CloneModelSelect } from "@/components/clone/model-select";
import type { CloneActionModel, CloneModelSelectModel } from "@/components/clone/view-models";

export function CloneActionBar({
  action,
}: {
  action: CloneActionModel;
}) {
  const {
    cloneTip,
    mobileSettingsOpen,
    cloneVideoModels,
    referenceImageModels,
    selectedModel,
    selectedReferenceImageModel,
    keepOriginalSound,
    removeTextOverlays,
    durationSec,
    referenceBatchSize,
    textErasureCost,
    totalRefCost,
    referenceBatchCost,
    videoCost,
    isSubmitting,
    isGenerating,
    compactActionLabel,
    primaryActionDisabled,
    onToggleMobileSettings,
    onCloseMobileSettings,
    onSelectModel,
    onSelectReferenceImageModel,
    onToggleSound,
    onToggleTextOverlays,
    onPrimaryAction,
  } = action;

  const videoSelect: CloneModelSelectModel = {
    label: "Final video",
    description: "Video model",
    accentClassName: "text-accent-blue",
    models: cloneVideoModels,
    selectedValue: selectedModel,
    onValueChange: onSelectModel,
    getCost: (modelId) => formatCost(calculateEstimatedCost(modelId, { durationSec })),
  };
  const referenceSelect: CloneModelSelectModel = {
    label: "Reference image",
    description: "Image model",
    accentClassName: "text-accent-green",
    models: referenceImageModels,
    selectedValue: selectedReferenceImageModel,
    onValueChange: onSelectReferenceImageModel,
    getCost: (modelId) =>
      formatCost(calculateEstimatedCost(modelId, { numImages: referenceBatchSize })),
  };

  return (
    <section
      data-clone-primary-action-bar="true"
      data-clone-generation-settings-bar="true"
      className="workspace-sidebar-offset-left pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 md:left-[72px] lg:px-8 xl:left-64"
    >
      <div
        className="pointer-events-auto relative mx-auto max-w-[1120px] rounded-2xl border border-border bg-card/96 p-2.5 shadow-[var(--pf-shadow-lg)] backdrop-blur-2xl sm:p-3"
        title={`${cloneTip.title}: ${cloneTip.body}`}
      >
        {mobileSettingsOpen && (
          <div className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] max-h-[min(70dvh,480px)] space-y-2 overflow-y-auto rounded-2xl border border-border bg-card/98 p-3 shadow-[var(--pf-shadow-lg)] backdrop-blur-2xl lg:hidden">
            <div className="mb-1 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-semibold text-foreground">Generation settings</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Models, sound, and cleanup</p>
              </div>
              <button
                type="button"
                onClick={onCloseMobileSettings}
                className="rounded-lg px-2 py-1 text-[12px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 hover:text-foreground/80"
              >
                Done
              </button>
            </div>

            <CloneModelSelect model={videoSelect} />
            <CloneModelSelect model={referenceSelect} />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3">
                <span className="truncate text-[13px] font-semibold text-foreground">Sound</span>
                <Switch checked={keepOriginalSound} onCheckedChange={onToggleSound} />
              </div>
              <div className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3">
                <span className="truncate text-[13px] font-semibold text-foreground">Remove text</span>
                <Switch checked={removeTextOverlays} onCheckedChange={onToggleTextOverlays} />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2 lg:hidden">
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={primaryActionDisabled}
            className="flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-accent-coral px-4 text-[13px] font-semibold text-white shadow-[var(--pf-shadow-orange)] transition-[filter,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-[0.93] active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <Zap className="size-3.5 shrink-0" />
            <span className="truncate">
              {isSubmitting
                ? "Starting..."
                : isGenerating
                  ? "Generating reference..."
                  : compactActionLabel}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleMobileSettings}
            aria-label="Generation settings"
            aria-expanded={mobileSettingsOpen}
            className={cn(
              "flex size-11 items-center justify-center rounded-lg border transition-colors",
              mobileSettingsOpen
                ? "border-accent-blue/40 bg-accent-blue/12 text-accent-blue"
                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>

        <div className="hidden gap-2 lg:grid lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(116px,140px)_minmax(108px,132px)_minmax(170px,220px)] lg:items-center">
          <CloneModelSelect model={videoSelect} className="min-w-0" />

          <CloneModelSelect model={referenceSelect} className="min-w-0" />

          <div className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3">
            <div className="flex min-w-0 items-center gap-2">
              <Volume2 className="size-4 shrink-0 text-muted-foreground" />
              <p className="truncate text-[13px] font-semibold text-foreground">
                Sound
              </p>
            </div>
            <Switch checked={keepOriginalSound} onCheckedChange={onToggleSound} />
          </div>

          <div className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3">
            <p className="truncate text-[13px] font-semibold text-foreground">
              Text
              {removeTextOverlays && (
                <span className="ml-1 font-mono text-[12px] text-accent-green">+{formatCost(textErasureCost)}</span>
              )}
            </p>
            <Switch checked={removeTextOverlays} onCheckedChange={onToggleTextOverlays} />
          </div>

          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={primaryActionDisabled}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent-coral px-4 text-[13px] font-semibold text-white shadow-[var(--pf-shadow-orange)] transition-[filter,transform] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-[0.93] active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <Zap className="size-3.5 shrink-0" />
            <span className="truncate">
              {isSubmitting
                ? "Starting..."
                : isGenerating
                  ? "Generating reference..."
                  : compactActionLabel}
            </span>
            {!isSubmitting && !isGenerating && (
              <span className="shrink-0 rounded-md bg-white/15 px-1.5 py-0.5 pf-data text-[12px] font-semibold">
                {formatCost((totalRefCost || referenceBatchCost) + videoCost + textErasureCost)}
              </span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
