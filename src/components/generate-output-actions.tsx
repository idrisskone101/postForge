import { Download, GalleryHorizontal, Loader2, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateOutputActionsProps {
  canDownload: boolean;
  isRetrying: boolean;
  onDownload: () => void;
  onRetry: () => void;
  onSaveToGallery: () => void;
  onUseInClone: () => void;
}

export function GenerateOutputActions({
  canDownload,
  isRetrying,
  onDownload,
  onRetry,
  onSaveToGallery,
  onUseInClone,
}: GenerateOutputActionsProps) {
  return (
    <div className="grid gap-3">
      <Button
        type="button"
        onClick={onDownload}
        disabled={!canDownload}
        className="h-11 justify-center gap-2 rounded-lg bg-accent-coral text-sm font-semibold text-white hover:bg-[#ff6540]"
      >
        <Download className="size-4" />
        Download
      </Button>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          disabled={isRetrying}
          className="h-11 justify-center gap-2 rounded-lg"
        >
          {isRetrying ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {isRetrying ? "Retrying..." : "Retry"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSaveToGallery}
          className="h-11 justify-center gap-2 rounded-lg"
        >
          <GalleryHorizontal className="size-4" />
          Save to Gallery
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onUseInClone}
        className="h-11 justify-center gap-2 rounded-lg border-accent-green/30 bg-accent-green/10 text-accent-green hover:bg-accent-green/15 hover:text-accent-green"
      >
        <Users className="size-4" />
        Use in Clone
      </Button>
    </div>
  );
}
