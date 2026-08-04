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
import {
  fetchPinterestCandidates,
  importPinterestImages,
  type PinterestCandidate,
} from "@/lib/collections-client";
import { cn } from "@/lib/utils";

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

export function PinterestImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (result: { imported: number; skipped: number }) => void;
}) {
  const [source, setSource] = useState<"search" | "board">("search");
  const [query, setQuery] = useState("faceless wellness aesthetic");
  const [collectionName, setCollectionName] = useState("Wellness inspiration");
  const [candidates, setCandidates] = useState<PinterestCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
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
      const results = await fetchPinterestCandidates({
        source,
        query: query.trim(),
      });
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

  const runImport = async () => {
    const urls = candidates
      .filter((candidate) => selected.includes(candidate.id))
      .map((candidate) => candidate.imageUrl);
    if (!urls.length || importing) return;
    setImporting(true);
    setError(null);
    try {
      const result = await importPinterestImages({
        urls,
        name: collectionName.trim() || "Pinterest import",
      });
      onImported(result);
      onOpenChange(false);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "The selected images could not be imported.",
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!importing) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-4xl! overflow-hidden rounded-[13px] border-[#DADBD2] p-0">
        <DialogHeader className="border-b border-[#E9EAE4] px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-[#232323]">
            <span className="flex size-9 items-center justify-center rounded-[9px] bg-[#FF4A20]/10 text-[#FF4A20]">
              <Images className="size-4" />
            </span>
            Import from Pinterest
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#777873]">
            Load a public Pinterest page, hand-pick its images, and save the
            originals into your shared library. Import fails closed when page
            data is unavailable.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-[#E9EAE4] p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="inline-flex h-10 rounded-[9px] bg-[#F0F1EB] p-1">
              <button
                type="button"
                onClick={() => changeSource("search")}
                className={cn(
                  "rounded-[7px] px-3 text-[11px] font-semibold transition",
                  source === "search"
                    ? "bg-white text-[#232323] shadow-sm"
                    : "text-[#777873] hover:text-[#30312E]",
                )}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => changeSource("board")}
                className={cn(
                  "rounded-[7px] px-3 text-[11px] font-semibold transition",
                  source === "board"
                    ? "bg-white text-[#232323] shadow-sm"
                    : "text-[#777873] hover:text-[#30312E]",
                )}
              >
                Board URL
              </button>
            </div>
            <label className="relative block">
              {source === "search" ? (
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#969792]" />
              ) : (
                <Link2 className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#969792]" />
              )}
              <input
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void runSearch();
                }}
                placeholder={
                  source === "search"
                    ? "Search Pinterest..."
                    : "https://pinterest.com/creator/board"
                }
                aria-label={source === "search" ? "Pinterest search" : "Pinterest board URL"}
                className="h-10 w-full rounded-[9px] border border-[#D7D8D0] bg-[#FCFCFA] pl-9 pr-3 text-[12px] outline-none transition focus:border-[#FF4A20] focus:ring-2 focus:ring-[#FF4A20]/10"
              />
            </label>
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={!sourceIsValid || searching}
              className="pf-button-primary h-10"
            >
              {searching ? <LoaderCircle className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
              {source === "search" ? "Search" : "Load board"}
            </button>
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
                  className="rounded-full border border-[#DADBD2] px-2.5 py-1 text-[10px] text-[#777873] transition hover:bg-[#F0F1EB] hover:text-[#30312E]"
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
                <p className="mt-3 text-[12px] font-semibold">Loading public images...</p>
                <p className="mt-1 text-[10px] text-[#777873]">
                  Pinterest may limit automated access to some pages.
                </p>
              </div>
            </div>
          ) : error && !candidates.length ? (
            <div className="grid min-h-64 place-items-center text-center" role="alert">
              <div className="max-w-md rounded-[11px] border border-destructive/25 bg-destructive/5 p-5">
                <p className="text-[12px] font-semibold text-destructive">
                  Pinterest import unavailable
                </p>
                <p className="mt-2 text-[11px] leading-5 text-[#777873]">
                  {error}
                </p>
                <p className="mt-2 text-[10px] text-[#969792]">
                  You can retry, paste another public board URL, or close this
                  dialog and upload images directly.
                </p>
              </div>
            </div>
          ) : candidates.length ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-[#30312E]">Public page images</p>
                  <p className="mt-1 text-[10px] text-[#777873]">
                    Direct i.pinimg.com references found on the loaded page. PostForge stores the originals you select.
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-[#969792]">
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
                        "group relative mb-2 block w-full break-inside-avoid overflow-hidden rounded-[9px] border-2 bg-[#F0F1EB] outline-none transition focus-visible:ring-2 focus-visible:ring-accent-blue",
                        isSelected
                          ? "border-accent-green"
                          : "border-transparent hover:border-[#BFC0B9]",
                      )}
                    >
                      {failedImages.includes(candidate.id) ? (
                        <span
                          className={cn(
                            "grid w-full place-items-center px-3 text-[10px] text-[#969792]",
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
                        <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-accent-green text-white shadow-lg">
                          <Check className="size-3.5" />
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
                <Images className="mx-auto size-7 text-[#969792]" />
                <p className="mt-3 text-[12px] font-semibold text-[#30312E]">
                  {hasSearched ? "No usable public images found" : "Choose a public source"}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[#777873]">
                  {hasSearched
                    ? "Try a different public board or upload images from your device."
                    : "Search a visual direction or paste a public Pinterest board URL to load real image candidates."}
                </p>
              </div>
            </div>
          )}
          {error && candidates.length ? (
            <p role="alert" className="mt-3 rounded-[9px] bg-destructive/10 p-3 text-[11px] text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E9EAE4] bg-[#F7F8F2] p-4 sm:flex-row sm:items-center sm:p-5">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Collection name</span>
            <input
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              placeholder="Collection name"
              maxLength={160}
              className="h-10 w-full rounded-[9px] border border-[#D7D8D0] bg-white px-3 text-[12px] outline-none transition focus:border-[#FF4A20] focus:ring-2 focus:ring-[#FF4A20]/10"
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
              disabled={!candidates.length || importing}
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelected([])}
              disabled={!selected.length || importing}
            >
              Clear
            </Button>
          </div>
          <button
            type="button"
            onClick={() => void runImport()}
            disabled={!selected.length || importing}
            className="pf-button-primary h-10"
          >
            {importing ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
            {importing ? "Importing..." : `Import ${selected.length} image${selected.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
