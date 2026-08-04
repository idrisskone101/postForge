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

interface GenerateOutputActionsProps {
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
}

export function GenerateOutputActions({
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
}: GenerateOutputActionsProps) {
  return (
    <div className="grid gap-2.5">
      {(actionError || actionNotice) && (
        <div
          role={actionError ? "alert" : "status"}
          className={
            actionError
              ? "flex min-w-0 items-start gap-2 rounded-lg bg-[#FEF0EF] px-3 py-2.5 text-[10px] leading-4 text-[#C53A32]"
              : "flex min-w-0 items-start gap-2 rounded-lg bg-[#EAF8ED] px-3 py-2.5 text-[10px] leading-4 text-[#238A40]"
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
        className="h-10 justify-center gap-2 rounded-[9px] bg-[#FF4A20] text-[11px] font-semibold text-white hover:bg-[#E9421C]"
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
            className="h-10 justify-center gap-2 rounded-[9px] border-[#DADBD2] bg-white text-[10px]"
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
          className="h-10 justify-center gap-2 rounded-[9px] border-[#DADBD2] bg-white text-[10px]"
        >
          <GalleryHorizontal className="size-3.5" />
          View in Gallery
        </Button>
        {onGenerateSimilar && (
          <Button
            type="button"
            variant="outline"
            onClick={onGenerateSimilar}
            className="h-10 justify-center gap-2 rounded-[9px] border-[#DADBD2] bg-white text-[10px]"
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
            className="h-10 justify-center gap-2 rounded-[9px] border-[#B9DEC2] bg-[#EFF8F1] text-[10px] font-semibold text-[#238A40] hover:bg-[#E6F4E9] hover:text-[#1D7535]"
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
            className="h-10 justify-center gap-2 rounded-[9px] border-[#DADBD2] bg-white text-[10px]"
          >
            <Workflow className="size-3.5" />
            Add to automation
          </Button>
        )}
      </div>
    </div>
  );
}
