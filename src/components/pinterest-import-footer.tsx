"use client";

import { FileJson, Images, LoaderCircle } from "lucide-react";

import type { PinterestImportWorkspace } from "@/components/pinterest-import-workspace";
import { Button } from "@/components/ui/button";
import { MAX_PINTEREST_IMPORT_IMAGES } from "@/lib/pinterest-constants";

export function PinterestImportFooter({
  workspace,
}: {
  workspace: PinterestImportWorkspace;
}) {
  const {
    workflow,
    collectionName,
    candidates,
    selected,
    failedImages,
    pendingAction,
    importing,
    updateCollectionName,
    setSelected,
    runImport,
  } = workspace;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-[var(--pf-active)] p-4 sm:flex-row sm:items-center sm:p-5">
      <label className="min-w-0 flex-1">
        <span className="mb-1 block text-[11px] font-semibold text-foreground">
          Save copies to collection
        </span>
        <input
          value={collectionName}
          onChange={(event) => updateCollectionName(event.target.value)}
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
            onClick={() => runImport("direct")}
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
            onClick={() => runImport("vibe")}
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
          onClick={() => runImport("import")}
          disabled={!selected.length || importing}
          className="pf-button-primary h-10"
        >
          {importing ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          {importing ? "Importing..." : `Import ${selected.length} image${selected.length === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}
