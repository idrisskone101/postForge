/* eslint-disable @next/next/no-img-element */
"use client";

import type { PinterestImportWorkspace } from "@/components/pinterest-import-workspace";
import { Button, EmptyState, Icon, Skeleton } from "@/components/workbench";
import { MAX_PINTEREST_IMPORT_IMAGES } from "@/lib/pinterest-constants";
import { cn } from "@/lib/utils";

export function PinterestImportResults({
  workspace,
}: {
  workspace: PinterestImportWorkspace;
}) {
  const {
    source,
    query,
    candidates,
    selected,
    failedImages,
    searching,
    loadingMore,
    importing,
    hasSearched,
    hasMore,
    error,
    toggleSelected,
    markCandidateImageFailed,
    loadMore,
  } = workspace;

  return (
    <div className="wb-scroll-fade-y wb-scroll-fade-deep min-h-0 flex-1 overflow-y-auto px-6 py-4 sm:min-h-72 max-sm:px-4">
      {searching ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <p className="wb-label" role="status">
            {source === "search" ? "Searching Pinterest" : "Loading board images"}
          </p>
          <div className="columns-2 gap-2.5 sm:columns-3 md:columns-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton
                key={index}
                shape="tile"
                className={cn("mb-2.5 break-inside-avoid", aspectFor(index))}
              />
            ))}
          </div>
        </div>
      ) : error && !candidates.length ? (
        <EmptyState
          icon="alert"
          tone="error"
          title={source === "search" ? "Pinterest search unavailable" : "Board unavailable"}
          detail={error}
          className="min-h-64"
        />
      ) : candidates.length ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="wb-label">{candidates.length} results</p>
            <span aria-live="polite" className="wb-mono text-fg-secondary">
              {selected.length} / {MAX_PINTEREST_IMPORT_IMAGES} selected
            </span>
          </div>
          <div className="columns-2 gap-2.5 sm:columns-3 md:columns-4">
            {candidates.map((candidate, index) => {
              const isSelected = selected.includes(candidate.id);
              const failed = failedImages.includes(candidate.id);
              return (
                <article
                  key={candidate.imageUrl}
                  className="group relative mb-2.5 break-inside-avoid p-1"
                >
                  <button
                    type="button"
                    onClick={() => toggleSelected(candidate.id)}
                    disabled={failed || importing}
                    aria-label={
                      failed
                        ? `Result ${index + 1} is unavailable`
                        : `${isSelected ? "Deselect" : "Select"} result ${index + 1}${candidate.altText ? `: ${candidate.altText}` : ""}`
                    }
                    aria-pressed={isSelected}
                    data-selected={isSelected ? "true" : undefined}
                    className="wb-tile block w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:cursor-not-allowed"
                  >
                    {failed ? (
                      <span
                        className={cn(
                          "grid w-full place-items-center px-3 text-[13px] text-fg-muted",
                          aspectFor(index),
                        )}
                      >
                        Image unavailable
                      </span>
                    ) : (
                      <img
                        src={candidate.imageUrl}
                        alt={candidate.altText ?? ""}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => markCandidateImageFailed(candidate.id)}
                        className={cn("block w-full object-cover", aspectFor(index))}
                      />
                    )}
                    {isSelected ? (
                      <span className="wb-tile-check">
                        <Icon name="check" size={12} strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                  <a
                    href={candidate.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open Pinterest result ${index + 1}`}
                    className="wb-icon-btn wb-icon-btn-28 absolute right-3 top-3 bg-[var(--pf-scrim)] text-[var(--pf-on-media)] opacity-100 transition-opacity duration-[var(--pf-dur-feedback)] ease-pf sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <Icon name="link" size={14} />
                  </a>
                </article>
              );
            })}
          </div>
          {source === "search" ? (
            <div className="flex flex-col items-center gap-2 border-t border-hairline pt-4 text-center">
              {hasMore ? (
                <Button onClick={loadMore} disabled={loadingMore || importing}>
                  {loadingMore ? "Loading more" : "Load more"}
                </Button>
              ) : (
                <p aria-live="polite" className="wb-meta">
                  All available public results are loaded.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyState
          icon={hasSearched ? "search" : "inspiration"}
          className="min-h-64"
          title={
            hasSearched
              ? source === "search"
                ? `No images found for “${query.trim()}”`
                : "No usable images found on this board"
              : "Search Pinterest or load a public board"
          }
          detail={
            hasSearched
              ? source === "search"
                ? "Try a broader search or switch to Board URL."
                : "Check that the board is public or try another board."
              : undefined
          }
        />
      )}
      {error && candidates.length ? (
        <p role="alert" className="wb-notice mt-3" data-tone="bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function aspectFor(index: number) {
  return index % 3 === 0 ? "aspect-[4/5]" : index % 3 === 1 ? "aspect-square" : "aspect-[3/4]";
}
