"use client";

import { CollectionReferencePicker } from "@/components/collection-reference-picker";
import { Button, Icon, Toggle } from "@/components/workbench";
import { ReferenceField } from "./form-reference-field";
import type { GenerateCollectionActions, GenerateCollectionModel } from "./form-types";

export function GenerateCollectionSection({
  view,
  actions,
}: {
  view: GenerateCollectionModel;
  actions: GenerateCollectionActions;
}) {
  const { collectionAssetIds, maxSelection, disabled, vibeMode } = view;

  return (
    <>
      <ReferenceField
        label="Visual collection"
        onClear={collectionAssetIds.length > 0 ? actions.onClear : undefined}
      >
        <CollectionReferencePicker
          selectedAssetIds={collectionAssetIds}
          onChange={actions.onCollectionChange}
          maxSelection={maxSelection}
          disabled={disabled}
          disabledMessage="Clear the video seed to use a collection"
        />
      </ReferenceField>
      {vibeMode ? <VibeEditor view={view} actions={actions} /> : null}
    </>
  );
}

function VibeEditor({
  view,
  actions,
}: {
  view: GenerateCollectionModel;
  actions: GenerateCollectionActions;
}) {
  const { vibeExtracting, vibeExtractError, vibeStale, vibeEditorActive, vibeJsonError } = view;

  return (
    <div className="wb-well flex flex-col gap-3 p-3.5 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <strong className="block text-[14px] font-semibold leading-5 text-fg">
            Collection vibe JSON
          </strong>
          <span className="wb-meta block [overflow-wrap:anywhere]">
            The collection is distilled into this JSON. Its images are never sent to the image
            model, so they cannot compete with your character.
          </span>
        </div>
        <Button
          variant="strong"
          size={32}
          onClick={actions.onExtractVibe}
          disabled={vibeExtracting}
          aria-busy={vibeExtracting}
        >
          <Icon name="generate" size={14} strokeWidth={1.8} />
          {vibeExtracting ? "Extracting" : vibeEditorActive ? "Extract again" : "Extract vibe JSON"}
        </Button>
      </div>

      {vibeExtractError ? (
        <p role="alert" className="wb-notice wb-fade-in" data-tone="bad">
          {vibeExtractError}
        </p>
      ) : null}
      {vibeStale ? (
        <p role="alert" className="wb-notice wb-fade-in" data-tone="warn">
          <strong>Collection changed.</strong> Extract again so the JSON matches the chosen images.
        </p>
      ) : null}

      {vibeEditorActive ? (
        <>
          <textarea
            aria-label="Vibe JSON"
            aria-invalid={vibeJsonError ? true : undefined}
            value={view.vibeJsonText}
            onChange={(event) => actions.onVibeJsonChange(event.target.value)}
            spellCheck={false}
            data-mono="true"
            className="wb-input min-h-56 resize-y py-2.5 font-mono text-[12px] leading-5"
          />
          {vibeJsonError ? (
            <p role="alert" className="wb-fade-in text-[12px] leading-4 text-bad">
              {vibeJsonError}
            </p>
          ) : null}
          <FoldControls view={view} actions={actions} />
        </>
      ) : null}
    </div>
  );
}

function FoldControls({
  view,
  actions,
}: {
  view: GenerateCollectionModel;
  actions: GenerateCollectionActions;
}) {
  const { foldEnabled, vibeFolding, vibeFoldError, foldStale, foldedPromptValue, prompt } = view;
  const folded = foldedPromptValue !== null;

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="flex-1 text-[14px] font-semibold leading-5 text-fg">
          Fold my prompt into the JSON
        </span>
        <Toggle
          checked={foldEnabled}
          onCheckedChange={actions.onFoldEnabledChange}
          label="Fold my prompt into the JSON"
        />
      </div>
      {foldEnabled ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="strong"
            size={32}
            onClick={actions.onFoldIntoVibe}
            disabled={
              vibeFolding || !view.vibeTemplate || !prompt.trim() || Boolean(view.vibeJsonError)
            }
            aria-busy={vibeFolding}
          >
            {vibeFolding ? "Folding" : "Fold into JSON"}
          </Button>
          {!prompt.trim() ? <span className="wb-meta">Write a prompt first</span> : null}
          {folded && foldStale ? (
            <span className="text-[13px] leading-4 text-warn">
              Prompt changed since the last fold
            </span>
          ) : null}
          {folded && !foldStale ? (
            <span className="text-[13px] leading-4 text-ok">Prompt folded into the JSON</span>
          ) : null}
        </div>
      ) : null}
      {vibeFoldError ? (
        <p role="alert" className="wb-notice wb-fade-in" data-tone="bad">
          {vibeFoldError}
        </p>
      ) : null}
    </>
  );
}
