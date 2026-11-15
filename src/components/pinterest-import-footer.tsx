"use client";

import type { PinterestImportWorkspace } from "@/components/pinterest-import-workspace";
import { Button, Field } from "@/components/workbench";
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
  const count = selected.length;

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-hairline px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:items-end max-sm:px-4">
      <div className={NAME_AND_SELECTION}>
        <Field label="Collection name" htmlFor="pinterest-collection-name" className="min-w-0 flex-1">
          <input
            id="pinterest-collection-name"
            className="wb-input"
            value={collectionName}
            onChange={(event) => updateCollectionName(event.target.value)}
            placeholder="Collection name"
            maxLength={160}
            disabled={importing}
          />
        </Field>
        {candidates.length > 0 ? (
        <div className="flex shrink-0 items-center gap-1 sm:h-[42px] max-sm:[@media(max-height:700px)]:h-[42px]">
          <Button
            variant="link"
            onClick={() =>
              setSelected(
                candidates
                  .filter((candidate) => !failedImages.includes(candidate.id))
                  .slice(0, MAX_PINTEREST_IMPORT_IMAGES)
                  .map((candidate) => candidate.id),
              )
            }
            disabled={importing}
          >
            {candidates.length > MAX_PINTEREST_IMPORT_IMAGES
              ? `Select first ${MAX_PINTEREST_IMPORT_IMAGES}`
              : "Select all"}
          </Button>
          <Button variant="link" onClick={() => setSelected([])} disabled={!count || importing}>
            Clear
          </Button>
        </div>
        ) : null}
      </div>
      {workflow === "slideshow" ? (
        <div className="grid gap-2 sm:flex sm:h-[42px] sm:items-center">
          <Button
            variant="strong"
            size={40}
            onClick={() => runImport("direct")}
            disabled={!count || importing}
          >
            {pendingAction === "direct"
              ? "Adding"
              : `Use ${count} as slide image${count === 1 ? "" : "s"}`}
          </Button>
          <Button
            variant="primary"
            size={40}
            onClick={() => runImport("vibe")}
            disabled={!count || importing}
          >
            {pendingAction === "vibe" ? "Creating style JSON" : `Create style JSON from ${count}`}
          </Button>
        </div>
      ) : (
        <div className="sm:flex sm:h-[42px] sm:items-center">
          <Button
            variant="primary"
            size={40}
            className="max-sm:w-full"
            onClick={() => runImport("import")}
            disabled={!count || importing}
          >
            {importing ? "Importing" : `Import ${count} image${count === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}
    </div>
  );
}

/*
 * From 640 the wrapper dissolves and its children sit in the footer row. On a short phone the name and
 * the selection links share one row, so the results above keep enough height for a whole tile.
 */
const NAME_AND_SELECTION =
  "flex min-w-0 flex-col gap-3 sm:contents max-sm:[@media(max-height:700px)]:flex-row max-sm:[@media(max-height:700px)]:items-end";
