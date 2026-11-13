"use client";

import type { PinterestImportWorkspace } from "@/components/pinterest-import-workspace";
import { Button, Icon } from "@/components/workbench";
import { cn } from "@/lib/utils";

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
  const invalid = !sourceIsValid && query.length > 0;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-hairline px-6 pb-4 pt-3.5 max-sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="wb-segmented h-[42px] shrink-0 self-start" role="group" aria-label="Pinterest source">
          {sources.map((item) => (
            <button
              key={item.value}
              type="button"
              className="wb-segment h-[34px] px-3.5"
              aria-pressed={source === item.value}
              onClick={() => changeSource(item.value)}
              disabled={importing}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 gap-2">
          <label className="wb-input-wrap min-w-0 flex-1">
            <Icon name={source === "search" ? "search" : "link"} size={16} />
            <input
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              disabled={importing}
              onKeyDown={(event) => {
                if (event.key === "Enter") runSearch();
              }}
              placeholder={
                source === "search"
                  ? "Search Pinterest"
                  : "https://pinterest.com/creator/board"
              }
              aria-label={source === "search" ? "Pinterest search" : "Pinterest board URL"}
              aria-invalid={invalid}
            />
          </label>
          <Button
            variant="strong"
            size={40}
            onClick={runSearch}
            disabled={!sourceIsValid || searching || loadingMore || importing}
            className="shrink-0"
          >
            {searching ? "Searching" : source === "search" ? "Search" : "Load board"}
          </Button>
        </div>
      </div>
      {invalid ? (
        <p className="wb-field-error" role="alert">
          {source === "board"
            ? "Enter an HTTPS pinterest.com or pin.it public board URL."
            : "Enter between 2 and 120 characters."}
        </p>
      ) : null}
      {source === "search" ? (
        <div className={cn("flex flex-wrap gap-1.5", hasCandidates && "max-sm:hidden")}>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => updateQuery(suggestion)}
              disabled={importing}
              aria-pressed={query === suggestion}
              className="wb-chip h-[30px] px-3 text-[13px]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const sources = [
  { value: "search", label: "Search" },
  { value: "board", label: "Board URL" },
] as const;

const suggestions = [
  "clean desk",
  "wellness routine",
  "cozy reading",
  "founder diary",
];
