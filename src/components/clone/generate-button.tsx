import { Button, type ButtonVariant } from "@/components/workbench";
import { cn } from "@/lib/utils";
import { formatCost } from "@/lib/utils/format-cost";
import type { CloneActionModel } from "@/components/clone/view-models";

export function CloneGenerateButton({
  action,
  className,
}: {
  action: CloneActionModel;
  className?: string;
}) {
  return <GenerateButton action={action} className={className} variant="primary" />;
}

export function CloneReadinessAction({
  action,
  className,
}: {
  action: CloneActionModel;
  className?: string;
}) {
  return <GenerateButton action={action} className={className} variant="strong" />;
}

function GenerateButton({
  action,
  className,
  variant,
}: {
  action: CloneActionModel;
  className?: string;
  variant: ButtonVariant;
}) {
  const {
    isSubmitting,
    isGenerating,
    compactActionLabel,
    primaryActionDisabled,
    totalRefCost,
    referenceBatchCost,
    videoCost,
    textErasureCost,
    onPrimaryAction,
  } = action;
  const busy = isSubmitting || isGenerating;
  return (
    <Button
      variant={variant}
      size={40}
      data-clone-primary-action="true"
      disabled={primaryActionDisabled}
      onClick={onPrimaryAction}
      className={cn("min-w-0", className)}
    >
      <span className="truncate">
        {isSubmitting
          ? "Starting"
          : isGenerating
            ? "Generating reference"
            : compactActionLabel}
      </span>
      {!busy && !primaryActionDisabled && (
        <span className="wb-mono shrink-0 opacity-70">
          {formatCost((totalRefCost || referenceBatchCost) + videoCost + textErasureCost)}
        </span>
      )}
    </Button>
  );
}
