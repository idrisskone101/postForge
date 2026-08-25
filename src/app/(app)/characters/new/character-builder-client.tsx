"use client";

import { Check, Download, Loader2, X } from "lucide-react";
import { CharacterAttributeEditor } from "./character-attribute-editor";
import { CharacterBuilderHeader } from "./character-builder-header";
import { CharacterCategoryRail } from "./character-category-rail";
import { CharacterPreviewStage } from "./character-preview-stage";
import { useCharacterBuilder } from "./use-character-builder";

export function CharacterBuilderClient({ editId = null }: { editId?: string | null }) {
  const {
    loading,
    attributes,
    activeSection,
    setActiveSection,
    headerView,
    previewView,
    attributeView,
    importOpen,
    setImportOpen,
    importValue,
    setImportValue,
    applyImport,
    toast,
  } = useCharacterBuilder(editId);
  if (loading) {
    return <div className="pf-content-viewport grid place-items-center"><Loader2 className="size-7 animate-spin text-[var(--pf-orange)]" /></div>;
  }

  return (
    <div
      data-character-workbench="true"
      className="pf-content-viewport bg-[var(--pf-canvas)] min-[1280px]:grid min-[1280px]:h-dvh min-[1280px]:min-h-0 min-[1280px]:grid-cols-[200px_minmax(420px,1.2fr)_minmax(360px,0.8fr)] min-[1280px]:grid-rows-[64px_minmax(0,1fr)] min-[1280px]:overflow-hidden"
    >
      <CharacterBuilderHeader view={headerView} />
      <CharacterCategoryRail
        attributes={attributes}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />
      <CharacterPreviewStage view={previewView} />
      <CharacterAttributeEditor view={attributeView} />

      {importOpen && <div className="pf-safe-overlay fixed inset-0 z-[70] grid place-items-center bg-black/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="import-character-title"><div className="max-h-full min-w-0 w-full max-w-lg overflow-y-auto rounded-[12px] bg-white p-5 shadow-2xl"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 id="import-character-title" className="mt-1 break-words text-[15px] font-semibold">Paste a prompt or attributes JSON</h2><p className="mt-1 break-words text-[12px] leading-4 text-muted-foreground">Recognized fields are merged into the current character. Everything else is ignored.</p></div><button onClick={() => setImportOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-full border border-border"><X className="size-3.5" /></button></div><textarea value={importValue} onChange={(event) => setImportValue(event.target.value)} className="mt-4 h-52 w-full min-w-0 resize-none rounded-lg border border-border bg-card p-3 font-mono text-[12px] leading-5 outline-none focus:border-[var(--pf-orange)]" placeholder={'{"gender":"Female","age":"25-30","freckles":"Light Subtle"}'} /><div className="mt-4 flex flex-col-reverse gap-2 min-[420px]:flex-row min-[420px]:justify-end"><button onClick={() => setImportOpen(false)} className="pf-button-secondary">Cancel</button><button onClick={applyImport} className="pf-button-primary"><Download className="size-3.5" /> Import attributes</button></div></div></div>}
      {toast && <div role="status" className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-background shadow-xl sm:left-auto sm:max-w-[420px]"><Check className="size-3.5 shrink-0 text-[var(--pf-success)]" /><span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span></div>}
    </div>
  );
}
