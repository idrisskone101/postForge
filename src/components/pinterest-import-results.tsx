/* eslint-disable @next/next/no-img-element */
"use client";

import { Check, ExternalLink, Images, LoaderCircle } from "lucide-react";

import type { PinterestCandidate } from "@/lib/collections-client";
import { MAX_PINTEREST_IMPORT_IMAGES } from "@/lib/pinterest-constants";
import { cn } from "@/lib/utils";

export function PinterestImportResults({
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
  onToggleSelected,
  onCandidateImageError,
  onLoadMore,
}: {
  source: "search" | "board";
  query: string;
  candidates: PinterestCandidate[];
  selected: string[];
  failedImages: string[];
  searching: boolean;
  loadingMore: boolean;
  importing: boolean;
  hasSearched: boolean;
  hasMore: boolean;
  error: string | null;
  onToggleSelected: (id: string) => void;
  onCandidateImageError: (id: string) => void;
  onLoadMore: () => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:min-h-72 sm:p-5">
      {searching ? (
        <div className="grid min-h-64 place-items-center text-center">
          <div>
            <LoaderCircle className="mx-auto size-6 animate-spin text-[var(--pf-orange)]" />
            <p className="mt-3 text-[12px] font-semibold">
              {source === "search" ? "Searching Pinterest..." : "Loading board images..."}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Some public Pinterest pages may block automated access.
            </p>
          </div>
        </div>
      ) : error && !candidates.length ? (
        <div className="grid min-h-64 place-items-center text-center" role="alert">
          <div className="max-w-md rounded-[6px] border border-destructive/25 bg-destructive/5 p-5">
            <p className="text-[12px] font-semibold text-destructive">
              {source === "search" ? "Pinterest search unavailable" : "Board unavailable"}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              {error}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {source === "search"
                ? "Try again, switch to Board URL, or add images in Collections."
                : "Try again, paste another public board URL, or add images in Collections."}
            </p>
          </div>
        </div>
      ) : candidates.length ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-foreground">Pinterest results</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Loaded from public Pinterest pages. Saved copies do not retain the source links shown here.
              </p>
            </div>
            <span aria-live="polite" className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
              {candidates.length} options · {selected.length}/{MAX_PINTEREST_IMPORT_IMAGES} selected
            </span>
          </div>
          <div className="columns-2 gap-2 sm:columns-3 md:columns-4">
            {candidates.map((candidate, index) => {
              const isSelected = selected.includes(candidate.id);
              return (
                <article key={candidate.imageUrl} className="group relative mb-2 break-inside-avoid">
                  <button
                    type="button"
                    onClick={() => onToggleSelected(candidate.id)}
                    disabled={failedImages.includes(candidate.id) || importing}
                    aria-label={
                      failedImages.includes(candidate.id)
                        ? `Result ${index + 1} is unavailable`
                        : `${isSelected ? "Deselect" : "Select"} result ${index + 1}${candidate.altText ? `: ${candidate.altText}` : ""}`
                    }
                    aria-pressed={isSelected}
                    className={cn(
                      "group relative block w-full overflow-hidden rounded-lg border-2 bg-[var(--pf-active)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--pf-orange)]",
                      isSelected
                        ? "border-[var(--pf-orange)]"
                        : "border-transparent hover:border-[var(--pf-border-strong)]",
                    )}
                  >
                    {failedImages.includes(candidate.id) ? (
                      <span
                        className={cn(
                          "grid w-full place-items-center px-3 text-[11px] text-muted-foreground",
                          index % 3 === 0
                            ? "aspect-[4/5]"
                            : index % 3 === 1
                              ? "aspect-square"
                              : "aspect-[3/4]",
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
                        onError={() => onCandidateImageError(candidate.id)}
                        className={cn(
                          "w-full object-cover",
                          index % 3 === 0
                            ? "aspect-[4/5]"
                            : index % 3 === 1
                              ? "aspect-square"
                              : "aspect-[3/4]",
                        )}
                      />
                    )}
                    {isSelected ? (
                      <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-[var(--pf-orange)] text-white shadow-[var(--pf-shadow-sm)]">
                        <Check className="size-3.5" />
                      </span>
                    ) : null}
                  </button>
                  <a
                    href={candidate.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open Pinterest result ${index + 1}`}
                    className="absolute left-2 top-2 grid size-8 place-items-center rounded-full bg-black/65 text-white opacity-100 shadow-[var(--pf-shadow-sm)] transition sm:size-6 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  >
                    <ExternalLink className="size-3" />
                  </a>
                </article>
              );
            })}
          </div>
          {source === "search" ? (
            <div className="mt-4 flex flex-col items-center border-t border-border pt-4 text-center">
              {hasMore ? (
                <>
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={loadingMore || importing}
                    className="pf-button-secondary h-11 min-w-36 sm:h-10"
                  >
                    {loadingMore ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : null}
                    {loadingMore ? "Loading more..." : "Load more"}
                  </button>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Keep loading until Pinterest has no more public results. Select up to {MAX_PINTEREST_IMPORT_IMAGES} per import.
                  </p>
                </>
              ) : (
                <p
                  aria-live="polite"
                  className="text-[11px] text-muted-foreground"
                >
                  All available public results are loaded.
                </p>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <div className="grid min-h-64 place-items-center text-center">
          <div className="max-w-sm">
            <Images className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 text-[12px] font-semibold text-foreground">
              {hasSearched
                ? source === "search"
                  ? `No images found for “${query.trim()}”`
                  : "No usable images found on this board"
                : "Search Pinterest or load a public board"}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {hasSearched
                ? source === "search"
                  ? "Try a broader search or switch to Board URL."
                  : "Check that the board is public or try another board."
                : "Select images to continue."}
            </p>
          </div>
        </div>
      )}
      {error && candidates.length ? (
        <p role="alert" className="mt-3 rounded-[5px] bg-destructive/10 p-3 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
