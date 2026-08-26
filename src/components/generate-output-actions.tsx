import {
  AlertCircle,
  CheckCircle2,
  Download,
  GalleryHorizontal,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type GenerateOutputActionsView = {
  canDownload: boolean;
  isRetrying: boolean;
  isDownloading?: boolean;
  showRetry?: boolean;
  actionError?: string | null;
  actionNotice?: string | null;
  onDownload: () => void;
  onRetry: () => void;
  onSaveToGallery: () => void;
  onUseInClone?: () => void;
  onGenerateSimilar?: () => void;
  onAddToAutomation?: () => void;
};

export function GenerateOutputActions({
  view,
}: {
  view: GenerateOutputActionsView;
}) {
  const {
    canDownload,
    isRetrying,
    isDownloading = false,
    showRetry = true,
    actionError = null,
    actionNotice = null,
    onDownload,
    onRetry,
    onSaveToGallery,
    onUseInClone,
    onGenerateSimilar,
    onAddToAutomation,
  } = view;

  return (
    <div className="grid gap-2.5">
      {(actionError || actionNotice) && (
        <div
          role={actionError ? "alert" : "status"}
          className={
            actionError
              ? "flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-danger)]/10 px-3 py-2.5 text-[12px] leading-4 text-[var(--pf-danger)]"
              : "flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-success)]/10 px-3 py-2.5 text-[12px] leading-4 text-[var(--pf-success)]"
          }
        >
          {actionError ? (
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          )}
          <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
            {actionError ?? actionNotice}
          </span>
        </div>
      )}

      <Button
        type="button"
        onClick={onDownload}
        disabled={!canDownload || isDownloading}
        className="pf-button-primary h-10 justify-center gap-2 text-[13px]"
      >
        {isDownloading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        {isDownloading ? "Preparing download…" : "Download"}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        {showRetry && (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="pf-button-secondary h-10 justify-center gap-2 text-[12px]"
          >
            {isRetrying ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            {isRetrying ? "Retrying…" : "Retry"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          aria-label="Save to Gallery"
          onClick={onSaveToGallery}
          className="pf-button-secondary h-10 justify-center gap-2 text-[12px]"
        >
          <GalleryHorizontal className="size-3.5" />
          View in Gallery
        </Button>
        {onGenerateSimilar && (
          <Button
            type="button"
            variant="outline"
            onClick={onGenerateSimilar}
            className="pf-button-secondary h-10 justify-center gap-2 text-[12px]"
          >
            <Sparkles className="size-3.5" />
            Generate similar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        {onUseInClone && (
          <Button
            type="button"
            variant="outline"
            onClick={onUseInClone}
            className="pf-button-secondary h-10 justify-center gap-2 text-[12px]"
          >
            <Users className="size-3.5" />
            Use in Clone
          </Button>
        )}
        {onAddToAutomation && (
          <Button
            type="button"
            variant="outline"
            onClick={onAddToAutomation}
            className="pf-button-secondary h-10 justify-center gap-2 text-[12px]"
          >
            <Workflow className="size-3.5" />
            Add to automation
          </Button>
        )}
      </div>
    </div>
  );
}
