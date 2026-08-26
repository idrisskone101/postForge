"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { isCharacterRecord, type CharacterRecord } from "@/lib/characters";
import { fetchWorkspaceFeature } from "@/lib/workspace-features-client";
import { CharacterDetailPanel } from "./characters-detail-panel";
import { CharactersEmpty } from "./characters-empty";
import { filterCharacters } from "./characters-helpers";
import { CharactersLibrary } from "./characters-library";
import {
  copyCharacterPrompt,
  duplicateCharacter,
  removeCharacter,
} from "./characters-mutations";
import type { CharactersPageClientProps } from "./types";

export function CharactersPageClient({ initialRecords }: CharactersPageClientProps) {
  const [records, setRecords] = useState<CharacterRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("All identities");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<CharacterRecord | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchWorkspaceFeature<CharacterRecord>("characters")
      .then(({ records: next }) => {
        if (!cancelled) setRecords(next.filter(isCharacterRecord));
      })
      .catch((cause) =>
        !cancelled &&
        setError(cause instanceof Error ? cause.message : "Unable to load characters")
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterCharacters(records, search, gender),
    [records, search, gender]
  );

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1700);
  }

  async function handleRemove(record: CharacterRecord) {
    setBusyId(record.id);
    setMenu(null);
    const result = await removeCharacter(record, records);
    setBusyId(null);
    switch (result.kind) {
      case "cancelled":
        return;
      case "deleted":
        setRecords(result.records);
        setSelected(null);
        notify("Character deleted");
        return;
      case "failed":
        setError(result.error);
        if (result.records) setRecords(result.records);
        if (result.recovered) setSelected(result.recovered);
        return;
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  async function handleDuplicate(record: CharacterRecord) {
    setBusyId(record.id);
    setMenu(null);
    const result = await duplicateCharacter(record);
    setBusyId(null);
    switch (result.kind) {
      case "saved":
        setRecords(result.records);
        notify("Draft duplicated — open it and save to make the identity reusable");
        return;
      case "failed":
        setError(result.error);
        return;
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  async function handleCopyPrompt(record: CharacterRecord) {
    await copyCharacterPrompt(record);
    notify("Character prompt copied");
  }

  if (loading && records.length > 0) {
    return (
      <div className="grid min-h-[520px] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-[var(--pf-orange)]" />
          <p className="mt-3 text-[12px] text-[var(--pf-muted)]">Loading identity library…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-page-inset="true"
      className="mx-auto min-w-0 max-w-[1280px] px-5 py-5 sm:px-7 lg:px-8"
    >
      {error ? (
        <div
          role="alert"
          className="mb-4 flex min-w-0 items-start justify-between gap-3 rounded-lg border border-[var(--pf-danger)]/40 bg-[var(--pf-danger)]/10 px-3 py-2 text-[12px] text-[var(--pf-danger)]"
        >
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span>
          <button type="button" onClick={() => setError(null)} className="shrink-0" aria-label="Dismiss error">
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}
      {records.length === 0 ? (
        <CharactersEmpty />
      ) : (
        <CharactersLibrary
          library={{
            recordCount: records.length,
            filtered,
            search,
            gender,
            view,
            menu,
            busyId,
            onSearchChange: setSearch,
            onGenderChange: setGender,
            onViewChange: setView,
            onSelect: setSelected,
            onMenuToggle: setMenu,
            onDuplicate: (record) => void handleDuplicate(record),
            onRemove: (record) => void handleRemove(record),
            onClearFilters: () => {
              setSearch("");
              setGender("All identities");
            },
          }}
        />
      )}
      {selected ? (
        <div
          className="pf-safe-overlay fixed inset-0 z-[70] grid place-items-center bg-black/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="character-detail-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-full min-w-0 w-full overflow-y-auto px-4"
            onClick={(event) => event.stopPropagation()}
          >
            <CharacterDetailPanel
              record={selected}
              onClose={() => setSelected(null)}
              onCopyPrompt={(record) => void handleCopyPrompt(record)}
              onRemove={(record) => void handleRemove(record)}
            />
          </div>
        </div>
      ) : null}
      {toast ? (
        <div
          role="status"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 right-5 z-[80] flex min-w-0 items-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-[12px] font-medium text-background shadow-xl sm:left-auto sm:max-w-[420px]"
        >
          <Check className="size-3.5 shrink-0 text-[var(--pf-success)]" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{toast}</span>
        </div>
      ) : null}
    </div>
  );
}
