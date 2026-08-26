"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Clipboard,
  Dices,
  Loader2,
  Save,
  Upload,
} from "lucide-react";
import { useWindowLoadReady } from "@/lib/use-window-load-ready";
import { CharactersPaintText } from "../characters-paint-text";
import type { CharacterBuilderHeaderViewModel } from "./types";

export function CharacterBuilderHeader({
  view,
}: {
  view: CharacterBuilderHeaderViewModel;
}) {
  const {
    editId,
    name,
    saving,
    rendering,
    missingEditRecord,
    previewSaveBlocked,
    onNameChange,
    randomizeAndRender,
    onImport,
    copyAttributes,
    saveCharacter,
    saveAction,
  } = view;
  const paintReady = useWindowLoadReady();
  const title = editId ? "Edit character" : "Character builder";
  const randomizeLabel = rendering ? "Rendering…" : "Randomize & render";

  return (
    <header
      data-character-workbench-header="true"
      className="flex flex-col gap-3 border-b border-[var(--pf-border)] bg-[var(--pf-surface)] px-4 py-3 min-[1280px]:col-span-3 min-[1280px]:row-start-1 min-[1280px]:h-16 min-[1280px]:flex-row min-[1280px]:items-center min-[1280px]:gap-4 min-[1280px]:py-2"
    >
      <div className="flex min-w-0 items-center gap-2 min-[1280px]:w-[184px] min-[1280px]:shrink-0">
        <Link
          href="/characters"
          aria-label="Back to characters"
          className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-[var(--pf-border)] text-[var(--pf-ink)] hover:bg-[var(--pf-active)]"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <CharactersPaintText
            ready={paintReady}
            liveAs="span"
            liveClassName="text-[13px] font-semibold text-[var(--pf-ink)] [overflow-wrap:anywhere]"
            paint={
              <h1 data-character-title={title}>
                <span className="sr-only">{title}</span>
              </h1>
            }
          >
            {title}
          </CharactersPaintText>
        </div>
      </div>

      <label
        className="min-w-0 min-[1280px]:max-w-[300px] min-[1280px]:flex-1"
        style={{ height: 36, overflow: "hidden" }}
      >
        <span className="sr-only">Character name</span>
        <input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          aria-label="Character name"
          className="h-9 w-full rounded-[8px] border border-[var(--pf-border)] bg-[var(--pf-canvas)] px-3 text-[11px] font-medium text-[var(--pf-ink)] outline-none transition focus:border-[var(--pf-orange)] focus:ring-2 focus:ring-[var(--pf-orange)]/15"
          placeholder="Add character name…"
        />
      </label>

      <div
        className="flex min-w-0 flex-nowrap gap-2 min-[1280px]:ml-auto"
        style={{ height: 36, overflow: "hidden" }}
      >
        <button
          type="button"
          onClick={randomizeAndRender}
          disabled={saving || rendering}
          aria-describedby="character-preview-generation-cost"
          title="Uses one paid image generation"
          data-character-action={paintReady ? undefined : randomizeLabel}
          className="pf-button-secondary h-9 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {rendering ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Dices className="size-3.5" />
          )}
          <CharacterActionLabel ready={paintReady} label={randomizeLabel} />
        </button>
        <button
          type="button"
          onClick={onImport}
          aria-label="Import prompt or JSON"
          data-character-action={paintReady ? undefined : "Import"}
          className="pf-button-secondary h-9"
        >
          <Upload className="size-3.5" />
          <CharacterActionLabel ready={paintReady} label="Import" />
        </button>
        <button
          type="button"
          onClick={copyAttributes}
          aria-label="Copy attributes JSON"
          data-character-action={paintReady ? undefined : "Copy JSON"}
          className="pf-button-secondary h-9"
        >
          <Clipboard className="size-3.5" />
          <CharacterActionLabel ready={paintReady} label="Copy JSON" />
        </button>
        <button
          type="button"
          onClick={saveCharacter}
          disabled={saving || rendering || missingEditRecord || previewSaveBlocked}
          aria-label="Save character"
          title={saveAction.title}
          data-character-action={paintReady ? undefined : saveAction.label}
          className="pf-button-primary h-9 shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Save className="size-3.5" />
          <CharacterActionLabel ready={paintReady} label={saveAction.label} />
        </button>
      </div>
    </header>
  );
}

function CharacterActionLabel({ ready, label }: { ready: boolean; label: string }) {
  if (!ready) return <span className="sr-only">{label}</span>;
  return <span>{label}</span>;
}
