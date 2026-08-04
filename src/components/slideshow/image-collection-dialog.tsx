/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import { Check, Images, Link2, LoaderCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { fetchPinterestImageCandidates } from "./api";
import type {
  PinterestImageCandidate,
  SlideshowCollection,
} from "./types";

const suggestions = [
  "clean desk",
  "wellness routine",
  "cozy reading",
  "founder diary",
];

function isPinterestBoardUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    const isPinterestHost =
      host === "pin.it" ||
      host === "pinterest.com" ||
      host.endsWith(".pinterest.com");
    return url.protocol === "https:" && !url.username && !url.password && isPinterestHost;
  } catch {
    return false;
  }
}

export function ImageCollectionDialog({
  open,
  onOpenChange,
  onCreate,
  apiBaseUrl = "/api/slideshows",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (collection: SlideshowCollection) => Promise<void>;
  apiBaseUrl?: string;
}) {
  const [source, setSource] = useState<"search" | "board">("search");
  const [query, setQuery] = useState("faceless wellness aesthetic");
  const [collectionName, setCollectionName] = useState("Wellness inspiration");
  const [candidates, setCandidates] = useState<PinterestImageCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const sourceIsValid = useMemo(
    () =>
      source === "search"
        ? query.trim().length >= 2 && query.trim().length <= 120
        : isPinterestBoardUrl(query),
    [query, source],
  );

  const resetResults = () => {
    requestVersion.current += 1;
    setCandidates([]);
    setSelected([]);
    setFailedImages([]);
    setHasSearched(false);
    setError(null);
    setSearching(false);
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    resetResults();
  };

  const changeSource = (nextSource: "search" | "board") => {
    setSource(nextSource);
    setQuery(nextSource === "search" ? "faceless wellness aesthetic" : "");
    resetResults();
  };

  const runSearch = async () => {
    if (!sourceIsValid || searching) return;
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    setSearching(true);
    setHasSearched(true);
    setError(null);
    setCandidates([]);
    setSelected([]);
    setFailedImages([]);

    try {
      const results = await fetchPinterestImageCandidates(
        { source, query: query.trim() },
        apiBaseUrl,
      );
      if (requestVersion.current !== version) return;
      setCandidates(results);
      setSelected(results.slice(0, 5).map((candidate) => candidate.id));
    } catch (searchError) {
      if (requestVersion.current !== version) return;
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Pinterest images could not be loaded.",
      );
    } finally {
      if (requestVersion.current === version) setSearching(false);
    }
  };

  const toggleSelected = (id: string) => {
    if (failedImages.includes(id)) return;
    setSelected((current) =>
      current.includes(id)
        ? current.filter((candidateId) => candidateId !== id)
        : [...current, id],
    );
  };

  const createCollection = async () => {
    const selectedCandidates = candidates.filter((candidate) =>
      selected.includes(candidate.id),
    );
    if (!selectedCandidates.length || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        id: `local-collection-${Date.now()}`,
        name: collectionName.trim() || "Untitled collection",
        imageCount: selectedCandidates.length,
        visualKeys: selectedCandidates.map((_, index) => `pinterest-${index + 1}`),
        imageUrls: selectedCandidates.map((candidate) => candidate.imageUrl),
        sourceUrls: selectedCandidates.map((candidate) => candidate.sourceUrl),
      });
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The Pinterest collection could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-4xl! overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <span className="flex size-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <Images className="size-4" />
            </span>
            Import from Pinterest
          </DialogTitle>
          <DialogDescription>
            Load a public Pinterest page, hand-pick its images, and save their
            source URLs as a reusable collection.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="inline-flex h-10 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => changeSource("search")}
                className={cn(
                  "rounded-md px-3 text-xs font-semibold transition",
                  source === "search"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => changeSource("board")}
                className={cn(
                  "rounded-md px-3 text-xs font-semibold transition",
                  source === "board"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                Board URL
              </button>
            </div>
            <label className="relative block">
              {source === "search" ? (
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              ) : (
                <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <input
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void runSearch();
                }}
                placeholder={
                  source === "search"
                    ? "Search Pinterest…"
                    : "https://pinterest.com/creator/board"
                }
                aria-label={source === "search" ? "Pinterest search" : "Pinterest board URL"}
                className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-xs outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20"
              />
            </label>
            <Button
              type="button"
              onClick={() => void runSearch()}
              disabled={!sourceIsValid || searching}
              className="h-10 bg-foreground text-background hover:bg-foreground/80"
            >
              {searching ? <LoaderCircle className="animate-spin" /> : <Search />}
              {source === "search" ? "Search" : "Load board"}
            </Button>
          </div>
          {!sourceIsValid && query ? (
            <p className="mt-2 text-[10px] text-destructive">
              {source === "board"
                ? "Enter an HTTPS pinterest.com or pin.it public board URL."
                : "Enter between 2 and 120 characters."}
            </p>
          ) : null}
          {source === "search" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => updateQuery(suggestion)}
                  className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="max-h-[48vh] min-h-72 overflow-y-auto p-4 sm:p-5">
          {searching ? (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <LoaderCircle className="mx-auto size-6 animate-spin text-accent-blue" />
                <p className="mt-3 text-xs font-semibold">Loading public images…</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Pinterest may limit automated access to some pages.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="grid min-h-64 place-items-center text-center" role="alert">
              <div className="max-w-md rounded-xl border border-destructive/25 bg-destructive/5 p-5">
                <p className="text-xs font-semibold text-destructive">
                  Pinterest import unavailable
                </p>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  {error}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  You can retry, paste another public board URL, or close this
                  dialog and upload images directly.
                </p>
              </div>
            </div>
          ) : candidates.length ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold">Public page images</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    These are direct i.pinimg.com references found on the loaded
                    page; PostForge does not claim ownership of them.
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {selected.length} selected
                </span>
              </div>
              <div className="columns-2 gap-2 sm:columns-3 md:columns-4">
                {candidates.map((candidate, index) => {
                  const isSelected = selected.includes(candidate.id);
                  return (
                    <button
                      key={candidate.imageUrl}
                      type="button"
                      onClick={() => toggleSelected(candidate.id)}
                      disabled={failedImages.includes(candidate.id)}
                      aria-label={
                        failedImages.includes(candidate.id)
                          ? `Result ${index + 1} is unavailable`
                          : `${isSelected ? "Deselect" : "Select"} result ${index + 1}`
                      }
                      aria-pressed={isSelected}
                      className={cn(
                        "group relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-xl border-2 bg-muted outline-none transition focus-visible:ring-2 focus-visible:ring-accent-blue",
                        isSelected
                          ? "border-accent-green"
                          : "border-transparent hover:border-foreground/25",
                      )}
                    >
                      {failedImages.includes(candidate.id) ? (
                        <span
                          className={cn(
                            "grid w-full place-items-center bg-muted px-3 text-[10px] text-muted-foreground",
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
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={() => {
                            setFailedImages((current) =>
                              current.includes(candidate.id)
                                ? current
                                : [...current, candidate.id],
                            );
                            setSelected((current) =>
                              current.filter((id) => id !== candidate.id),
                            );
                          }}
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
                        <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-accent-green text-white shadow-lg">
                          <Check className="size-4" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid min-h-64 place-items-center text-center">
              <div className="max-w-sm">
                <Images className="mx-auto size-7 text-muted-foreground" />
                <p className="mt-3 text-xs font-semibold">
                  {hasSearched ? "No usable public images found" : "Choose a public source"}
                </p>
                <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                  {hasSearched
                    ? "Try a different public board or upload images from your device."
                    : "Search a visual direction or paste a public Pinterest board URL to load real image candidates."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:p-5">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Collection name</span>
            <input
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              placeholder="Collection name"
              maxLength={160}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent-blue"
            />
          </label>
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setSelected(
                  candidates
                    .filter((candidate) => !failedImages.includes(candidate.id))
                    .map((candidate) => candidate.id),
                )
              }
              disabled={!candidates.length || saving}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected([])}
              disabled={!selected.length || saving}
            >
              Clear
            </Button>
          </div>
          <Button
            type="button"
            onClick={() => void createCollection()}
            disabled={!selected.length || saving}
            className="bg-accent-coral text-white hover:bg-[#ff6540]"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : null}
            {saving ? "Saving…" : `Create collection (${selected.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
