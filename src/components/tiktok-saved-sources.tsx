import type { MouseEvent } from "react";
import { Button, CountBadge, Icon } from "@/components/workbench";
import { MediaImage } from "@/components/workbench/media-image";
import { cloneSourceTitle } from "@/components/clone/clone-source-title";
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
    <div className="flex min-w-0 flex-col gap-2.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={showSavedSources}
        aria-controls="saved-source-grid"
        className="wb-hit flex w-fit items-center gap-2 rounded-sm"
      >
        <span className="wb-label">Saved sources</span>
        <CountBadge count={savedSources.length} />
        <Icon
          name="chevron-down"
          size={14}
          className={cn(
            "text-fg-muted transition-transform duration-[200ms] ease-pf",
            showSavedSources && "rotate-180"
          )}
        />
      </button>

      {showSavedSources && (
        <div
          id="saved-source-grid"
          data-saved-source-grid="true"
          className="wb-scroll-fade-y wb-scroll-fade-deep -m-1.5 grid max-h-[524px] grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-x-3 gap-y-4 overflow-y-auto p-1.5 scroll-py-[30px]"
        >
          {savedSources.map((source, index) => {
            const isSelected = selectedSourceId === source.id;
            const name = cloneSourceTitle(source.label) ?? { title: "Saved source", shortId: null };
            return (
              <div key={source.id} className="wb-tile-cell group relative">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(source)}
                  className="flex min-w-0 flex-col gap-2 rounded-lg text-left outline-offset-4"
                >
                  <span
                    className={cn(
                      "relative block aspect-[9/16] w-full overflow-hidden rounded-lg bg-media",
                      "transition-shadow duration-[160ms] ease-pf",
                      isSelected && "shadow-[0_0_0_2px_var(--pf-panel),0_0_0_4px_var(--pf-ember)]"
                    )}
                  >
                    {source.thumbnailPath ? (
                      <MediaImage
                        src={`/api/ugc-clone/sources/${source.id}/thumbnail`}
                        alt=""
                        // The first thumbnail is the largest image in the first viewport.
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : "auto"}
                        className="size-full object-cover"
                      />
                    ) : null}
                    {isSelected && (
                      <span className="absolute left-2 top-2 grid size-[22px] animate-[wb-check-in_160ms_var(--pf-ease)] place-items-center rounded-full bg-ember text-[var(--pf-on-ember)]">
                        <Icon name="check" size={12} strokeWidth={3} />
                      </span>
                    )}
                    <span className="wb-tile-duration">{formatDuration(source.durationSec)}</span>
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={cn(
                        "truncate text-[13px] leading-4 text-fg",
                        isSelected ? "font-bold" : "font-semibold"
                      )}
                    >
                      {name.title}
                    </span>
                    {name.shortId || source.fileSizeBytes ? (
                      <span className="flex min-w-0 items-center gap-2 text-[12px] leading-4 text-fg-muted">
                        {name.shortId ? <span className="wb-mono">{name.shortId}</span> : null}
                        {source.fileSizeBytes ? (
                          <span className="truncate">{formatSize(source.fileSizeBytes)}</span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </button>

                <button
                    type="button"
                    onClick={(e) => onDelete(source.id, e)}
                    disabled={deletingId === source.id}
                    aria-label={`Delete ${source.label}`}
                    className="wb-hit absolute right-2 top-2 inline-flex h-7 items-center rounded-full bg-[var(--pf-scrim)] px-2.5 text-[12px] font-semibold leading-4 text-[var(--pf-on-media)] opacity-0 transition-opacity duration-[160ms] ease-pf focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-100 pointer-coarse:opacity-100"
                  >
                    {deletingId === source.id ? "Deleting" : "Delete"}
                  </button>
              </div>
            );
          })}
          {sourcesNextCursor && (
            <div className="col-span-full flex justify-center">
              <Button size={32} onClick={onLoadMore} disabled={isLoadingMoreSources}>
                {isLoadingMoreSources ? "Loading" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


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