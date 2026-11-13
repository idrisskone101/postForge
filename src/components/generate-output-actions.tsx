import { Button, IconButton } from "@/components/workbench";
import { cn } from "@/lib/utils";

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

/**
 * The output cluster of the generation action dock. The last handoff is the
 * screen's one bone primary: Use in Clone for images, Automate otherwise.
 */
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
  const message = actionError ?? actionNotice;

  return (
    <div className="flex min-w-0 items-center gap-2 max-sm:contents">
      {message && (
        <p
          role={actionError ? "alert" : "status"}
          className="wb-notice min-w-0 flex-1 py-2 [overflow-wrap:anywhere]"
          data-tone={actionError ? "bad" : "ok"}
        >
          {message}
        </p>
      )}
      <div className="flex flex-none items-center gap-2 max-sm:ml-auto">
        <IconButton
          icon="download"
          label={isDownloading ? "Preparing download" : "Download"}
          variant="outline"
          size={40}
          onClick={onDownload}
          disabled={!canDownload || isDownloading}
        />
        <IconButton icon="gallery" label="Save to Gallery" variant="outline" size={40} onClick={onSaveToGallery} />
      </div>
      <div className="flex min-w-0 items-center gap-2 max-sm:basis-full max-sm:[&>*]:flex-1">
        {showRetry && (
          <Button variant="outline" size={40} onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? "Retrying…" : "Retry"}
          </Button>
        )}
        {onGenerateSimilar && (
          <Button variant="outline" size={40} onClick={onGenerateSimilar}>
            Generate similar
          </Button>
        )}
        {onAddToAutomation && (
          <Button
            variant={onUseInClone ? "outline" : "primary"}
            size={40}
            aria-label="Add to automation"
            onClick={onAddToAutomation}
            className={cn(!onUseInClone && "px-5")}
          >
            Automate
          </Button>
        )}
        {onUseInClone && (
          <Button variant="primary" size={40} onClick={onUseInClone} className="px-5">
            Use in Clone
          </Button>
        )}
      </div>
    </div>
  );
}
