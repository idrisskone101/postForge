"use client";

import { useRouter } from "next/navigation";
import { Button, EmptyState, IconButton, Toast } from "@/components/workbench";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CharacterDeleteDialog } from "./characters-delete-dialog";
import { CharacterDetailPanel } from "./characters-detail-panel";
import { CharactersEmpty } from "./characters-empty";
import { CharactersLibrary } from "./characters-library";
import type { CharacterInspectorModel, CharactersInitialData } from "./types";
import { useCharactersLibrary } from "./use-characters-library";

export function CharactersPageClient({ initial }: { initial: CharactersInitialData }) {
  const router = useRouter();
  const library = useCharactersLibrary(initial);
  const { selected } = library;
  const inspector: CharacterInspectorModel | null = selected
    ? {
        record: selected,
        busy: library.busyId === selected.id,
        onCopyPrompt: library.copyPrompt,
        onDuplicate: library.duplicate,
        onRequestDelete: library.requestDelete,
      }
    : null;

  if (initial.error && library.records.length === 0) {
    return (
      <section aria-label="Character library" className="wb-panel flex-1 p-6">
        <EmptyState icon="alert" tone="error" title="Characters could not load" detail={initial.error}>
          <Button variant="strong" onClick={() => router.refresh()}>
            Try again
          </Button>
        </EmptyState>
      </section>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 xl:h-[calc(100dvh-100px)] xl:min-h-[640px] xl:flex-row" data-characters-page>
      {library.records.length === 0 ? (
        <CharactersEmpty />
      ) : (
        <CharactersLibrary
          library={{
            recordCount: library.records.length,
            filtered: library.filtered,
            filters: library.filters,
            selectedId: selected?.id ?? null,
            onFiltersChange: library.onFiltersChange,
            onSelect: library.select,
          }}
          onClearFilters={library.clearFilters}
        />
      )}
      {inspector ? (
        <aside
          aria-labelledby="character-detail-title-panel"
          data-characters-inspector
          className="wb-panel hidden w-[360px] shrink-0 gap-4 overflow-y-auto p-5 xl:flex"
        >
          <CharacterDetailPanel key={inspector.record.id} inspector={inspector} />
        </aside>
      ) : null}
      <Sheet open={library.sheetOpen && inspector !== null} onOpenChange={(open) => (open ? null : library.closeSheet())}>
        <SheetContent
          side="bottom"
          aria-labelledby="character-detail-title-sheet"
          showCloseButton={false}
          className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-xl px-4 pt-3 data-[side=bottom]:pb-[max(24px,env(safe-area-inset-bottom))] xl:hidden"
        >
          <span className="mx-auto mb-3.5 block h-1 w-9 rounded-full bg-raised-strong" aria-hidden="true" />
          <IconButton icon="x" label="Close details" size={34} className="absolute right-4 top-4" onClick={library.closeSheet} />
          {inspector ? <CharacterDetailPanel key={inspector.record.id} inspector={inspector} variant="sheet" /> : null}
        </SheetContent>
      </Sheet>
      <CharacterDeleteDialog
        record={library.deleting}
        onCancel={library.cancelDelete}
        onConfirm={library.confirmDelete}
      />
      <div className="wb-toast-region">
        {library.toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={library.dismissToast} />
        ))}
      </div>
    </div>
  );
}
