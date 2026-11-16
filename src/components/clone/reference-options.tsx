import { Chip, Field } from "@/components/workbench";
import { formatCost } from "@/lib/utils/format-cost";
import {
  formatIdentityRole,
  REFERENCE_BATCH_OPTIONS,
} from "@/components/clone/constants";
import { useCloneReference } from "@/components/clone/clone-reference-provider";

export function CloneReferenceOptions() {
  const {
    hairstyleOptions,
    selectedHairstyleRole,
    referenceBatchSize,
    referenceBatchCost,
    isSubmitting,
    isGenerating,
    submitError,
    onSelectHairstyleRole,
    onSelectBatchSize,
  } = useCloneReference();
  const busy = isSubmitting || isGenerating;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-4">
        {hairstyleOptions.length > 0 && (
          <Field label="Hairstyle" className="min-w-0 flex-1 basis-60">
            <div className="flex flex-wrap gap-2">
              <Chip
                chosen={selectedHairstyleRole === null}
                disabled={busy}
                onClick={() => onSelectHairstyleRole(null)}
              >
                Original
              </Chip>
              {hairstyleOptions.map((option) => (
                <Chip
                  key={option.id}
                  chosen={selectedHairstyleRole === option.role}
                  disabled={busy}
                  onClick={() => onSelectHairstyleRole(option.role)}
                >
                  {formatIdentityRole(option.role)}
                </Chip>
              ))}
            </div>
          </Field>
        )}
        <div
          data-reference-batch-size={referenceBatchSize}
          data-reference-generation-summary="true"
          className="wb-field shrink-0"
        >
          <div className="flex items-center justify-between gap-3">
            <span id="clone-reference-count" className="wb-label">
              References
            </span>
            <span className="wb-mono text-fg-secondary">{formatCost(referenceBatchCost)}</span>
          </div>
          <div role="group" aria-labelledby="clone-reference-count" className="wb-segmented">
            {REFERENCE_BATCH_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                data-reference-count-option={count}
                onClick={() => onSelectBatchSize(count)}
                disabled={busy}
                className="wb-segment min-w-11 disabled:cursor-not-allowed disabled:opacity-50"
                aria-pressed={referenceBatchSize === count}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {submitError && (
        <p role="alert" className="wb-notice min-w-0 [overflow-wrap:anywhere]" data-tone="bad">
          <span className="min-w-0">
            <strong className="font-semibold text-bad">Could not start.</strong> {submitError}
          </span>
        </p>
      )}
    </div>
  );
}
