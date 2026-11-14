"use client";

import { useMemo, useRef, useState } from "react";

import { PinterestImportFooter } from "@/components/pinterest-import-footer";
import { PinterestImportResults } from "@/components/pinterest-import-results";
import { PinterestImportSearch } from "@/components/pinterest-import-search";
import type {
  PinterestImportAction,
  PinterestImportWorkflow,
  PinterestImportWorkspace,
} from "@/components/pinterest-import-workspace";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconButton } from "@/components/workbench";
import {
  fetchPinterestCandidates,
  importPinterestImages,
  pinterestImageUrlsInSelectionOrder,
  type PinterestCandidate,
  type PinterestImportResult,
} from "@/lib/collections-client";
import type { PinterestCandidateSource } from "@/lib/collections/pinterest-types";
import { MAX_PINTEREST_IMPORT_IMAGES } from "@/lib/pinterest-constants";

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
  workflow?: PinterestImportWorkflow;
  onUseDirect?: (result: PinterestImportResult) => void | Promise<void>;
  onCreateVibe?: (
    result: PinterestImportResult,
    idempotencyKey: string,
  ) => void | Promise<void>;
}) {
  const [source, setSource] = useState<PinterestCandidateSource>("search");
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
  const [pendingAction, setPendingAction] = useState<PinterestImportAction | null>(
    null,
  );
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

  const changeSource = (nextSource: PinterestCandidateSource) => {
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

  const markCandidateImageFailed = (id: string) => {
    setFailedImages((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setSelected((current) => current.filter((selectedId) => selectedId !== id));
  };

  const updateCollectionName = (value: string) => {
    setCollectionName(value);
    setCollectionNameEdited(true);
  };

  const runImport = async (action: PinterestImportAction) => {
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
  const workspace: PinterestImportWorkspace = {
    source,
    query,
    sourceIsValid,
    workflow,
    collectionName,
    candidates,
    selected,
    failedImages,
    searching,
    loadingMore,
    importing,
    hasSearched,
    hasMore,
    error,
    pendingAction,
    changeSource,
    updateQuery,
    runSearch: () => void runSearch(),
    loadMore: () => void loadMore(),
    toggleSelected,
    markCandidateImageFailed,
    updateCollectionName,
    setSelected,
    runImport: (action) => void runImport(action),
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!importing) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none! flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-[min(92vh,800px)] sm:max-h-[92vh] sm:w-[calc(100vw-2rem)] sm:max-w-[880px]! sm:rounded-xl"
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-3 px-6 pb-0 pt-[max(20px,env(safe-area-inset-top))] max-sm:px-4">
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="text-[16px] font-bold leading-5 tracking-[-0.01em] text-fg">
              {workflow === "slideshow" ? "Pinterest references" : "Import from Pinterest"}
            </DialogTitle>
            {workflow === "slideshow" ? (
              <DialogDescription className="wb-meta">
                Copies are saved to a new collection either way.
              </DialogDescription>
            ) : null}
          </div>
          <DialogClose
            disabled={importing}
            render={<IconButton icon="x" label="Close" variant="ghost" size={30} />}
          />
        </DialogHeader>

        <PinterestImportSearch workspace={workspace} />
        <PinterestImportResults workspace={workspace} />
        <PinterestImportFooter workspace={workspace} />
      </DialogContent>
    </Dialog>
  );
}


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

function defaultCollectionName(source: PinterestCandidateSource, value: string) {
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