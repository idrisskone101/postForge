"use client";

import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { Button, Icon } from "@/components/workbench";

import type { CreatorDraft } from "./view-models";

export function CreatorTemplatePanel({ draft }: { draft: CreatorDraft }) {
  const {
    onOpenPinterest,
    referenceAssetIds,
    onReferenceAssetIdsChange,
    referenceRefreshKey,
    preferredReferenceAssetIds,
    deriving,
    onDeriveFromReferences,
    templateText,
    onTemplateTextChange,
    copiedJson,
    onCopyTemplateJson,
    templateError,
  } = draft;
  return (
    <>
      <section
        aria-labelledby="creator-references-label"
        className="flex flex-col gap-2 border-t border-hairline pt-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span id="creator-references-label" className="wb-label">
              Reference images
            </span>
            <span className="text-[13px] leading-4 text-fg-secondary">
              These shape generated slides.
            </span>
          </div>
          <Button size={32} onClick={onOpenPinterest}>
            Search Pinterest
          </Button>
        </div>
        <CollectionReferencePicker
          selectedAssetIds={referenceAssetIds}
          onChange={onReferenceAssetIdsChange}
          maxSelection={14}
          refreshKey={referenceRefreshKey}
          preferredAssetIds={preferredReferenceAssetIds}
        />
        <div>
          <Button
            variant="strong"
            onClick={() => void onDeriveFromReferences()}
            disabled={!referenceAssetIds.length || deriving}
            aria-busy={deriving || undefined}
          >
            {deriving ? "Deriving template" : "Derive template"}
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="creator-template-json" className="wb-label">
            Aesthetic JSON
          </label>
          <Button size={32} onClick={() => void onCopyTemplateJson()}>
            {copiedJson ? <Icon name="check" strokeWidth={2} /> : null}
            {copiedJson ? "Copied" : "Copy JSON"}
          </Button>
        </div>
        <textarea
          id="creator-template-json"
          value={templateText}
          onChange={(event) => onTemplateTextChange(event.target.value)}
          rows={9}
          spellCheck={false}
          className="wb-input min-h-[200px] font-mono text-[12px] leading-[18px] text-fg-secondary"
        />
      </div>

      {templateError ? (
        <p role="alert" className="wb-notice" data-tone="bad">
          <strong>{templateError}</strong>
        </p>
      ) : null}
    </>
  );
}
