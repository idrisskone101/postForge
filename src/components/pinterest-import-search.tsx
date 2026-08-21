"use client";

import { Link2, LoaderCircle, Search } from "lucide-react";

import type { PinterestImportWorkspace } from "@/components/pinterest-import-workspace";
import { cn } from "@/lib/utils";

const suggestions = [
  "clean desk",
  "wellness routine",
  "cozy reading",
  "founder diary",
];

export function PinterestImportSearch({
  workspace,
}: {
  workspace: PinterestImportWorkspace;
}) {
  const {
    source,
    query,
    sourceIsValid,
    searching,
    loadingMore,
    importing,
    candidates,
    changeSource,
    updateQuery,
    runSearch,
  } = workspace;
  const hasCandidates = candidates.length > 0;

  return (
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
              if (event.key === "Enter") runSearch();
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
          onClick={runSearch}
          disabled={!sourceIsValid || searching || loadingMore || importing}
          className={cn(hasCandidates ? "pf-button-secondary" : "pf-button-primary", "h-10")}
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
        <div className={cn("mt-3 flex flex-wrap gap-2", hasCandidates && "hidden sm:flex")}>
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
  );
}
