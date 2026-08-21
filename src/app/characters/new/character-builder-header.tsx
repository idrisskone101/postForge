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

export function CharacterBuilderHeader({
  editId,
  name,
  saving,
  rendering,
  missingEditRecord,
  previewSaveBlocked,
  readyPreviewFingerprint,
  onNameChange,
  randomizeAndRender,
  onImport,
  copyAttributes,
  saveCharacter,
}: {
  editId: string | null;
  name: string;
  saving: boolean;
  rendering: boolean;
  missingEditRecord: boolean;
  previewSaveBlocked: boolean;
  readyPreviewFingerprint: string | null;
  onNameChange: (name: string) => void;
  randomizeAndRender: () => void;
  onImport: () => void;
  copyAttributes: () => void;
  saveCharacter: () => void;
}) {
  return (
    <header
      data-character-workbench-header="true"
      className="flex flex-col gap-3 border-b border-border bg-white px-4 py-3 min-[1280px]:col-span-3 min-[1280px]:row-start-1 min-[1280px]:h-16 min-[1280px]:flex-row min-[1280px]:items-center min-[1280px]:gap-4 min-[1280px]:py-2"
    >
      <div className="flex min-w-0 items-center gap-2 min-[1280px]:w-[184px] min-[1280px]:shrink-0">
        <Link href="/characters" aria-label="Back to characters" className="grid size-8 shrink-0 place-items-center rounded-lg border border-border hover:bg-[var(--pf-active)]">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em]">{editId ? "Edit character" : "Character builder"}</h1>
        </div>
      </div>

      <label className="min-w-0 flex-1 min-[1280px]:max-w-[300px]">
        <span className="sr-only">Character name</span>
        <input value={name} onChange={(event) => onNameChange(event.target.value)} aria-label="Character name" className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[11px] font-medium outline-none transition focus:border-[var(--pf-orange)] focus:bg-white focus:ring-2 focus:ring-[var(--pf-orange)]/15" placeholder="Add character name…" />
      </label>

      <div className="flex min-w-0 flex-wrap gap-2 min-[1280px]:ml-auto min-[1280px]:flex-nowrap">
        <button
          onClick={randomizeAndRender}
          disabled={saving || rendering}
          aria-describedby="character-preview-generation-cost"
          title="Uses one paid image generation"
          className="pf-button-secondary h-9 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {rendering ? <Loader2 className="size-3.5 animate-spin" /> : <Dices className="size-3.5" />}
          {rendering ? "Rendering…" : "Randomize & render"}
        </button>
        <button onClick={onImport} aria-label="Import prompt or JSON" className="pf-button-secondary h-9"><Upload className="size-3.5" /> Import</button>
        <button onClick={copyAttributes} aria-label="Copy attributes JSON" className="pf-button-secondary h-9"><Clipboard className="size-3.5" /> Copy JSON</button>
        <button onClick={saveCharacter} disabled={saving || rendering || missingEditRecord || previewSaveBlocked} aria-label="Save character" title={rendering ? "Wait for the preview render to finish" : previewSaveBlocked ? "Re-render the photographic preview before saving" : undefined} className="pf-button-primary h-9 shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-45"><Save className="size-3.5" /> {saving ? "Saving…" : rendering ? "Rendering…" : missingEditRecord ? "Unavailable" : previewSaveBlocked ? "Preview changed" : readyPreviewFingerprint ? "Save" : "Save draft"}</button>
      </div>
    </header>
  );
}
