/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  FileJson,
  Images,
  Link2,
  LoaderCircle,
  Search,
} from "lucide-react";

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
  pinterestImageUrlsInSelectionOrder,
  type PinterestCandidate,
  type PinterestImportResult,
} from "@/lib/collections-client";
import { cn } from "@/lib/utils";
import { MAX_PINTEREST_IMPORT_IMAGES } from "@/lib/pinterest-constants";

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

function defaultCollectionName(source: "search" | "board", value: string) {
  let subject = value.trim();
  if (source === "board") {
    try {
      subject = new URL(subject).pathname.split("/").filter(Boolean).at(-1) ?? "";
    } catch {
      subject = "";
    }
  }
  subject = subject
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const titled = subject
    ? `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`
    : "Pinterest";
  return `${titled} references`.slice(0, 160);
}

export function PinterestImportDialog({
  open,
  onOpenChange,
  onImported,
  workflow = "collection",
  onUseDirect,
  onCreateVibe,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (result: PinterestImportResult) => void;
  workflow?: "collection" | "slideshow";
  onUseDirect?: (result: PinterestImportResult) => void | Promise<void>;
  onCreateVibe?: (
    result: PinterestImportResult,
    idempotencyKey: string,
  ) => void | Promise<void>;
}) {
  const [source, setSource] = useState<"search" | "board">("search");
  const [query, setQuery] = useState("faceless wellness aesthetic");
  const [collectionName, setCollectionName] = useState(() =>
    defaultCollectionName("search", "faceless wellness aesthetic"),
  );
  const [collectionNameEdited, setCollectionNameEdited] = useState(false);
  const [candidates, setCandidates] = useState<PinterestCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "import" | "direct" | "vibe" | null
  >(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importedSelection = useRef<{
    key: string;
    result: PinterestImportResult;
  } | null>(null);
  const vibeRequestKeys = useRef(new Map<string, string>());
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
    setLoadingMore(false);
    setCursor(null);
    setHasMore(false);
    importedSelection.current = null;
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    resetResults();
  };

  const changeSource = (nextSource: "search" | "board") => {
    setSource(nextSource);
    const nextQuery = nextSource === "search" ? "faceless wellness aesthetic" : "";
    setQuery(nextQuery);
    setCollectionName(defaultCollectionName(nextSource, nextQuery));
    setCollectionNameEdited(false);
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
    if (!collectionNameEdited) {
      setCollectionName(defaultCollectionName(source, query));
    }

    try {
      const results = await fetchPinterestCandidates({
        source,
        query: query.trim(),
      });
      if (requestVersion.current !== version) return;
      setCandidates(results.candidates);
      setCursor(results.cursor);
      setHasMore(results.hasMore);
      setSelected(
        workflow === "collection"
          ? results.candidates.slice(0, 5).map((candidate) => candidate.id)
          : [],
      );
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

  const loadMore = async () => {
    if (!cursor || loadingMore || searching || pendingAction) return;
    const version = requestVersion.current;
    setLoadingMore(true);
    setError(null);

    try {
      const results = await fetchPinterestCandidates({
        source,
        query: query.trim(),
        cursor,
      });
      if (requestVersion.current !== version) return;
      setCandidates((current) => {
        const candidateIds = new Set(current.map((candidate) => candidate.id));
        const imageUrls = new Set(
          current.map((candidate) => candidate.imageUrl),
        );
        const additions = results.candidates.filter(
          (candidate) =>
            !candidateIds.has(candidate.id) &&
            !imageUrls.has(candidate.imageUrl),
        );
        return [...current, ...additions];
      });
      setCursor(results.cursor);
      setHasMore(results.hasMore);
    } catch (loadError) {
      if (requestVersion.current !== version) return;
      setError(
        loadError instanceof Error
          ? `More Pinterest results could not be loaded. ${loadError.message}`
          : "More Pinterest results could not be loaded. Try again.",
      );
    } finally {
      if (requestVersion.current === version) setLoadingMore(false);
    }
  };

  const toggleSelected = (id: string) => {
    if (failedImages.includes(id) || pendingAction) return;
    setSelected((current) =>
      current.includes(id)
        ? current.filter((candidateId) => candidateId !== id)
        : current.length >= MAX_PINTEREST_IMPORT_IMAGES
          ? current
          : [...current, id],
    );
  };

  const runImport = async (action: "import" | "direct" | "vibe") => {
    const urls = pinterestImageUrlsInSelectionOrder(candidates, selected);
    if (!urls.length || pendingAction) return;
    setPendingAction(action);
    setError(null);
    let savedResult: PinterestImportResult | null = null;
    try {
      const selectionKey = urls.join("\n");
      const result =
        importedSelection.current?.key === selectionKey
          ? importedSelection.current.result
          : await importPinterestImages({
              urls,
              name: collectionName.trim() || "Pinterest import",
            });
      savedResult = result;
      importedSelection.current = { key: selectionKey, result };
      if (action === "direct") await onUseDirect?.(result);
      else if (action === "vibe") {
        const idempotencyKey =
          vibeRequestKeys.current.get(selectionKey) ?? crypto.randomUUID();
        vibeRequestKeys.current.set(selectionKey, idempotencyKey);
        await onCreateVibe?.(result, idempotencyKey);
      }
      else onImported?.(result);
      onOpenChange(false);
    } catch (importError) {
      const detail =
        importError instanceof Error
          ? importError.message
          : "The requested Pinterest workflow could not be completed.";
      setError(
        action === "vibe" && savedResult
          ? `Images were saved to “${collectionName.trim() || "Pinterest import"}”, but PostForge could not create the visual style JSON. ${detail} Retry, or derive it later from Saved reference images.`
          : detail,
      );
    } finally {
      setPendingAction(null);
    }
  };

  const importing = pendingAction !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!importing) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none! flex-col overflow-hidden rounded-none border-border p-0 sm:h-auto sm:max-h-[92vh] sm:w-[calc(100vw-2rem)] sm:max-w-4xl! sm:rounded-lg">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-foreground">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
              <Images className="size-4" />
            </span>
            {workflow === "slideshow" ? "Pinterest references" : "Import from Pinterest"}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground">
            {workflow === "slideshow"
              ? "Choose Pinterest images, then use them as slide images or create visual style JSON. PostForge saves copies to a new Collection either way."
              : "Load a public Pinterest page, hand-pick its images, and save the originals into your shared library. Import fails closed when page data is unavailable."}
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-border p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="inline-flex h-10 rounded-lg bg-[var(--pf-active)] p-1">
              <button
                type="button"
                onClick={() => changeSource("search")}
                disabled={importing}
                className={cn(
                  "rounded-lg px-3 text-[11px] font-semibold transition",
                  source === "search"
                    ? "bg-card text-foreground shadow-[var(--pf-shadow-2xs)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => changeSource("board")}
                disabled={importing}
                className={cn(
                  "rounded-lg px-3 text-[11px] font-semibold transition",
                  source === "board"
                    ? "bg-card text-foreground shadow-[var(--pf-shadow-2xs)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Board URL
              </button>
            </div>
            <label className="relative block">
              {source === "search" ? (
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              ) : (
                <Link2 className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              )}
              <input
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                disabled={importing}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void runSearch();
                }}
                placeholder={
                  source === "search"
                    ? "Search Pinterest..."
                    : "https://pinterest.com/creator/board"
                }
                aria-label={source === "search" ? "Pinterest search" : "Pinterest board URL"}
                className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-[12px] outline-none transition focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10"
              />
            </label>
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={!sourceIsValid || searching || loadingMore || importing}
              className={cn(candidates.length ? "pf-button-secondary" : "pf-button-primary", "h-10")}
            >
              {searching ? <LoaderCircle className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
              {source === "search" ? "Search" : "Load board"}
            </button>
          </div>
          {!sourceIsValid && query ? (
            <p className="mt-2 text-[11px] text-destructive">
              {source === "board"
                ? "Enter an HTTPS pinterest.com or pin.it public board URL."
                : "Enter between 2 and 120 characters."}
            </p>
          ) : null}
          {source === "search" ? (
            <div className={cn("mt-3 flex flex-wrap gap-2", candidates.length && "hidden sm:flex")}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => updateQuery(suggestion)}
                  disabled={importing}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-[var(--pf-active)] hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>

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
                        onClick={() => toggleSelected(candidate.id)}
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
                        onClick={() => void loadMore()}
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

        <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-[var(--pf-active)] p-4 sm:flex-row sm:items-center sm:p-5">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-[11px] font-semibold text-foreground">
              Save copies to collection
            </span>
            <input
              value={collectionName}
              onChange={(event) => {
                setCollectionName(event.target.value);
                setCollectionNameEdited(true);
              }}
              placeholder="Collection name"
              maxLength={160}
              disabled={importing}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[12px] outline-none transition focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/10"
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
                    .slice(0, MAX_PINTEREST_IMPORT_IMAGES)
                    .map((candidate) => candidate.id),
                )
              }
              disabled={!candidates.length || importing}
            >
              {candidates.length > MAX_PINTEREST_IMPORT_IMAGES
                ? `Select first ${MAX_PINTEREST_IMPORT_IMAGES}`
                : "Select all"}
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
          {workflow === "slideshow" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void runImport("direct")}
                disabled={!selected.length || importing}
                className="pf-button-secondary h-10"
              >
                {pendingAction === "direct" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Images className="size-3.5" />
                )}
                {pendingAction === "direct"
                  ? "Adding..."
                  : `Use ${selected.length} as slide image${selected.length === 1 ? "" : "s"}`}
              </button>
              <button
                type="button"
                onClick={() => void runImport("vibe")}
                disabled={!selected.length || importing}
                className="pf-button-primary h-10"
              >
                {pendingAction === "vibe" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <FileJson className="size-3.5" />
                )}
                {pendingAction === "vibe"
                  ? "Creating style JSON..."
                  : `Create style JSON from ${selected.length}`}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void runImport("import")}
              disabled={!selected.length || importing}
              className="pf-button-primary h-10"
            >
              {importing ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              {importing ? "Importing..." : `Import ${selected.length} image${selected.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
