import type { MouseEvent } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Trash2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SavedTikTokSource {
  id: string;
  label: string;
  originalUrl: string;
  localPath: string;
  filename: string;
  durationSec: number;
  width: number;
  height: number;
  fileSizeBytes: number | null;
  thumbnailPath: string | null;
  createdAt: string;
}

export type SourceListPage = {
  items: SavedTikTokSource[];
  nextCursor: string | null;
};

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

function formatSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TikTokSavedSources({
  savedSources,
  selectedSourceId,
  showSavedSources,
  sourcesNextCursor,
  isLoadingMoreSources,
  deletingId,
  onToggle,
  onSelect,
  onDelete,
  onLoadMore,
}: {
  savedSources: SavedTikTokSource[];
  selectedSourceId: string | null | undefined;
  showSavedSources: boolean;
  sourcesNextCursor: string | null;
  isLoadingMoreSources: boolean;
  deletingId: string | null;
  onToggle: () => void;
  onSelect: (source: SavedTikTokSource) => void;
  onDelete: (id: string, event: MouseEvent) => void;
  onLoadMore: () => void;
}) {
  if (savedSources.length === 0 && !sourcesNextCursor) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-3 rounded-lg border border-border bg-muted/25 px-3 py-2 transition-colors hover:bg-muted/45"
      >
        <Video className="size-3.5 text-muted-foreground" />
        <span className="flex flex-1 items-center gap-1.5 text-left text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          Saved sources ({savedSources.length})
          <ChevronDown
            className={cn(
              "size-3 transition-transform",
              showSavedSources && "rotate-180"
            )}
          />
        </span>
      </button>

      {showSavedSources && (
        <div
          data-saved-source-grid="true"
          className="mt-2 grid max-h-[360px] grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 overflow-y-auto pr-1"
        >
          {savedSources.map((source) => {
            const isSelected = selectedSourceId === source.id;
            return (
              <div
                key={source.id}
                className={cn(
                  "group relative overflow-hidden rounded-lg border-2 transition-all",
                  isSelected
                    ? "border-accent-green shadow-[0_0_0_2px_rgba(22,163,74,0.2)]"
                    : "border-border hover:border-accent-green/50"
                )}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(source)}
                  className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-accent-green/40 focus:ring-offset-2 focus:ring-offset-background"
                >
                  <div className="aspect-[9/16] bg-muted flex items-center justify-center">
                    {source.thumbnailPath ? (
                      <img
                        src={`/api/ugc-clone/sources/${source.id}/thumbnail`}
                        alt={source.label}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Video className="size-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="absolute top-1.5 right-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {formatDuration(source.durationSec)}
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                    <p className="text-[11px] font-medium text-white truncate">
                      {source.label}
                    </p>
                    {source.fileSizeBytes && (
                      <p className="text-[11px] text-white/60">
                        {formatSize(source.fileSizeBytes)}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <div className="absolute inset-0 bg-accent-green/10 flex items-center justify-center">
                      <CheckCircle2 className="size-6 text-accent-green drop-shadow-lg" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={(e) => onDelete(source.id, e)}
                  disabled={deletingId === source.id}
                  className="absolute top-1.5 left-1.5 z-10 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/80"
                  aria-label={`Delete ${source.label}`}
                >
                  {deletingId === source.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                </button>
              </div>
            );
          })}
          {sourcesNextCursor && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMoreSources}
              className="col-span-full inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-[12px] font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingMoreSources && <Loader2 className="size-3.5 animate-spin" />}
              {isLoadingMoreSources ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
