"use client";

import {
  AlertCircle,
  Braces,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { Switch } from "@/components/ui/switch";
import type {
  GenerateCollectionActions,
  GenerateCollectionModel,
} from "./form-types";

export function GenerateCollectionSection({
  view,
  actions,
}: {
  view: GenerateCollectionModel;
  actions: GenerateCollectionActions;
}) {
  const {
    avatarId,
    collectionAssetIds,
    maxSelection,
    disabled,
    vibeMode,
    vibeExtracting,
    vibeExtractError,
    vibeStale,
    vibeEditorActive,
    vibeJsonText,
    vibeJsonError,
    vibeTemplate,
    foldEnabled,
    vibeFolding,
    vibeFoldError,
    foldStale,
    foldedPromptValue,
    prompt,
  } = view;
  const {
    onClear,
    onCollectionChange,
    onExtractVibe,
    onVibeJsonChange,
    onFoldEnabledChange,
    onFoldIntoVibe,
  } = actions;
  return (
    <div className="pf-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="pf-section-title">
              Visual collection
            </h2>
            <span className="rounded-full bg-[var(--pf-active)] px-2 py-1 text-[13px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Optional
            </span>
          </div>
          <p className="mt-2 max-w-lg text-[12px] leading-4 text-muted-foreground">
            {avatarId
              ? "Distill the shared vibe of collection images (like Pinterest saves) into an editable JSON that steers the generation."
              : "Reuse server-owned product, location, or style images from Collections."}
          </p>
        </div>
        {collectionAssetIds.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[12px] font-semibold text-[var(--pf-link)] hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <CollectionReferencePicker
        selectedAssetIds={collectionAssetIds}
        onChange={onCollectionChange}
        maxSelection={maxSelection}
        disabled={disabled}
        disabledMessage="Clear the video seed to use visual collection references."
      />
      {vibeMode && (
        <div className="mt-3 space-y-3 rounded-lg border border-border bg-[var(--pf-active)] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <strong className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                <Braces className="size-3.5 text-muted-foreground" /> Collection vibe JSON
              </strong>
              <span className="mt-1 block text-[12px] leading-4 text-muted-foreground">
                With a character identity selected, collection images are distilled
                into this JSON. The images themselves are never sent to the image
                model, so your character&rsquo;s identity is never in competition with
                people in the inspiration photos.
              </span>
            </div>
            <button
              type="button"
              onClick={onExtractVibe}
              disabled={vibeExtracting}
              aria-busy={vibeExtracting}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-[var(--pf-surface)] px-2.5 text-[12px] font-semibold text-[var(--pf-link)] hover:border-[var(--pf-border-strong)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {vibeExtracting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              {vibeExtracting
                ? "Extracting…"
                : vibeEditorActive
                  ? "Re-extract vibe JSON"
                  : "Extract vibe JSON"}
            </button>
          </div>

          {vibeExtractError && (
            <div
              role="alert"
              className="flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] leading-4 text-[var(--pf-danger)]"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                {vibeExtractError}
              </span>
            </div>
          )}

          {vibeStale && (
            <div
              role="alert"
              className="flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-lamp-amber)]/10 px-3 py-2 text-[12px] leading-4 text-[var(--pf-lamp-amber)]"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                Your collection selection changed. Re-extract the vibe JSON so it
                matches the selected images.
              </span>
            </div>
          )}

          {vibeEditorActive && (
            <>
              <textarea
                aria-label="Vibe JSON"
                value={vibeJsonText}
                onChange={(event) => onVibeJsonChange(event.target.value)}
                spellCheck={false}
                className="min-h-56 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 font-mono text-[13px] leading-5 text-foreground shadow-none outline-none focus:border-[var(--pf-orange)]"
              />
              {vibeJsonError ? (
                <div
                  role="alert"
                  className="flex items-start gap-1.5 text-[12px] leading-4 text-[var(--pf-danger)]"
                >
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{vibeJsonError}</span>
                </div>
              ) : (
                <p className="text-[12px] leading-4 text-muted-foreground">
                  This JSON is fed to the image model verbatim, together with your
                  character identity. Edit any value to steer the result.
                </p>
              )}

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-[var(--pf-surface)] px-3 py-2.5">
                <span className="min-w-0">
                  <strong className="block text-[12px] font-semibold text-foreground">
                    Fold my prompt into the JSON
                  </strong>
                  <small className="mt-0.5 block text-[12px] leading-4 text-muted-foreground">
                    Merge your prompt (for example &ldquo;eating a sandwich&rdquo;) into the
                    vibe JSON with the intelligence model from Settings
                  </small>
                </span>
                <Switch
                  aria-label="Fold my prompt into the JSON"
                  checked={foldEnabled}
                  onCheckedChange={onFoldEnabledChange}
                />
              </div>

              {foldEnabled && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onFoldIntoVibe}
                    disabled={
                      vibeFolding ||
                      !vibeTemplate ||
                      !prompt.trim() ||
                      Boolean(vibeJsonError)
                    }
                    aria-busy={vibeFolding}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-[var(--pf-surface)] px-2.5 text-[12px] font-semibold text-[var(--pf-link)] hover:border-[var(--pf-border-strong)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {vibeFolding ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    {vibeFolding ? "Folding…" : "Fold into JSON"}
                  </button>
                  {!prompt.trim() && (
                    <span className="text-[12px] text-muted-foreground">
                      Write a prompt first.
                    </span>
                  )}
                  {foldStale && foldedPromptValue !== null && (
                    <span className="text-[12px] leading-4 text-[var(--pf-lamp-amber)]">
                      Your prompt changed since the last fold. Fold again to update
                      the JSON.
                    </span>
                  )}
                  {!foldStale && foldedPromptValue !== null && (
                    <span className="inline-flex items-center gap-1 text-[12px] leading-4 text-[var(--pf-success)]">
                      <CheckCircle2 className="size-3.5" /> Prompt folded into the
                      JSON
                    </span>
                  )}
                </div>
              )}

              {vibeFoldError && (
                <div
                  role="alert"
                  className="flex min-w-0 items-start gap-2 rounded-lg bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] leading-4 text-[var(--pf-danger)]"
                >
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                    {vibeFoldError}
                  </span>
                </div>
              )}
            </>
          )}

          {!vibeEditorActive && !vibeExtracting && !vibeExtractError && (
            <p className="text-[12px] leading-4 text-muted-foreground">
              Extract the vibe JSON to combine this collection with your character
              identity.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
