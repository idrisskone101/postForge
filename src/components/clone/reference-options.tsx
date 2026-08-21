import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import {
  formatIdentityRole,
  REFERENCE_BATCH_OPTIONS,
} from "@/components/clone/constants";
import type { CloneReferenceWorkspace } from "@/components/clone/view-models";

export function CloneReferenceOptions({
  workspace,
}: {
  workspace: CloneReferenceWorkspace;
}) {
  const {
    hairstyleOptions,
    selectedHairstyleRole,
    referenceBatchSize,
    referenceBatchCost,
    isSubmitting,
    isGenerating,
    referenceReady,
    submitError,
    onSelectHairstyleRole,
    onSelectBatchSize,
  } = workspace;
  return (
    <div className="flex min-w-0 flex-col gap-3 self-start rounded-lg border border-border bg-muted/40 p-3 sm:p-4">
      <div className="mb-1">
        <p className="text-xs font-semibold text-foreground">Reference options</p>
        <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">
          Choose the look for your next reference.
        </p>
      </div>
      {hairstyleOptions.length > 0 && (
        <div className="w-full rounded-lg border border-border bg-muted/30 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
              Hairstyle
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onSelectHairstyleRole(null)}
              disabled={isSubmitting || isGenerating}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                selectedHairstyleRole === null
                  ? "border-accent-green bg-accent-green/20 text-accent-green"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground/80"
              )}
              aria-pressed={selectedHairstyleRole === null}
            >
              Original
            </button>
            {hairstyleOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectHairstyleRole(option.role)}
                disabled={isSubmitting || isGenerating}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  selectedHairstyleRole === option.role
                    ? "border-accent-green bg-accent-green/20 text-accent-green"
                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground/80"
                )}
                aria-pressed={selectedHairstyleRole === option.role}
              >
                {formatIdentityRole(option.role)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div
        data-reference-batch-size={referenceBatchSize}
        className="w-full rounded-lg border border-border bg-muted/30 p-2.5"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
            References
          </span>
          <span className="font-mono text-[12px] text-muted-foreground/80">
            {formatCost(referenceBatchCost)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {REFERENCE_BATCH_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              data-reference-count-option={count}
              onClick={() => onSelectBatchSize(count)}
              disabled={isSubmitting || isGenerating}
              className={cn(
                "h-8 rounded-lg border text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                referenceBatchSize === count
                  ? "border-accent-green bg-accent-green/20 text-accent-green"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground/80"
              )}
              aria-pressed={referenceBatchSize === count}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <div
        data-reference-generation-summary="true"
        className={cn(
          "rounded-lg border p-3",
          isGenerating
            ? "border-accent-blue/25 bg-accent-blue/[0.06]"
            : referenceReady
              ? "border-accent-green/25 bg-accent-green/[0.06]"
              : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-start gap-2.5">
          <span className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
            isGenerating
              ? "bg-accent-blue/10 text-accent-blue"
              : referenceReady
                ? "bg-accent-green/10 text-accent-green"
                : "bg-muted/50 text-muted-foreground"
          )}>
            {isGenerating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : referenceReady ? (
              <Check className="size-3.5" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-foreground/90">
                {isGenerating
                  ? "Generating references"
                  : referenceReady
                    ? "Reference ready"
                    : `Ready for ${referenceBatchSize} ${referenceBatchSize === 1 ? "reference" : "references"}`}
              </p>
              <span className="shrink-0 font-mono text-[12px] text-muted-foreground/80">
                {formatCost(referenceBatchCost)}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-4 text-muted-foreground/80">
              {isGenerating
                ? "You can keep reviewing the inputs while this finishes."
                : referenceReady
                  ? "The selected still is ready for clone generation."
                  : "Use the action bar below when the options look right."}
            </p>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="min-w-0 break-words rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive [overflow-wrap:anywhere]">
          {submitError}
        </div>
      )}
    </div>
  );
}
