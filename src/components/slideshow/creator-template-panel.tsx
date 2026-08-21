"use client";

import {
  Check,
  Copy,
  Link2,
  LoaderCircle,
  ScanSearch,
} from "lucide-react";

import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { cn } from "@/lib/utils";

import {
  CARD,
  FIELD_LABEL,
  INPUT,
  SECONDARY_BTN,
} from "./studio-ui";

export function CreatorTemplatePanel({
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
}: {
  onOpenPinterest: () => void;
  referenceAssetIds: string[];
  onReferenceAssetIdsChange: (ids: string[]) => void;
  referenceRefreshKey: number;
  preferredReferenceAssetIds: string[];
  deriving: boolean;
  onDeriveFromReferences: () => void;
  templateText: string;
  onTemplateTextChange: (value: string) => void;
  copiedJson: boolean;
  onCopyTemplateJson: () => void;
  templateError: string | null;
}) {
  return (
        <section className={cn(CARD, "p-5")} aria-label="Visual template">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[var(--pf-active)] text-muted-foreground">
              <ScanSearch className="size-4" />
            </span>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">
                Visual template (JSON)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                The aesthetic contract that stays consistent across slides.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-foreground">Pinterest references</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Import into Collections, then place images on slides or derive style JSON.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPinterest}
              className={cn(SECONDARY_BTN, "shrink-0")}
            >
              <Link2 className="size-3.5" /> Search Pinterest
            </button>
          </div>

          <div className="mt-3 block">
            <span className={cn(FIELD_LABEL)}>Saved reference images (optional)</span>
            <p className="mb-1 text-[11px] text-muted-foreground">
              These shape generated slides. To place an image on a slide, use the slot next to that slide.
            </p>
            <div className="mt-1">
              <CollectionReferencePicker
                selectedAssetIds={referenceAssetIds}
                onChange={onReferenceAssetIdsChange}
                maxSelection={14}
                refreshKey={referenceRefreshKey}
                preferredAssetIds={preferredReferenceAssetIds}
              />
            </div>
            <button
              type="button"
              onClick={() => void onDeriveFromReferences()}
              disabled={!referenceAssetIds.length || deriving}
              className={cn(
                SECONDARY_BTN,
                "mt-2 w-full",
                referenceAssetIds.length ? "hover:border-[var(--pf-orange)] hover:text-[var(--pf-orange)]" : "",
              )}
            >
              {deriving ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <ScanSearch className="size-3.5" />
              )}
              {deriving ? "Deriving template..." : "Derive template from references"}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className={cn(FIELD_LABEL, "mb-0")}>Aesthetic JSON</span>
            <button
              type="button"
              onClick={() => void onCopyTemplateJson()}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-[var(--pf-active)] hover:text-foreground"
            >
              {copiedJson ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copiedJson ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <label className="block">
            <span className="sr-only">Aesthetic JSON</span>
            <textarea
              value={templateText}
              onChange={(event) => onTemplateTextChange(event.target.value)}
              rows={14}
              spellCheck={false}
              className={cn(INPUT, "mt-1 resize-y font-mono text-[11px] leading-4")}
            />
          </label>

          {templateError ? (
            <p role="alert" className="mt-2 rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive">
              {templateError}
            </p>
          ) : null}
        </section>
  );
}
