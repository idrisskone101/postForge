"use client";

import { useCallback, useMemo, useState } from "react";
import type { ToastMessage } from "@/components/workbench";
import type { CharacterRecord } from "@/lib/characters";
import { filterCharacters } from "./characters-helpers";
import {
  copyCharacterPrompt,
  duplicateCharacter,
  removeCharacter,
} from "./characters-mutations";
import type { CharactersFilters, CharactersInitialData } from "./types";

type Selection = {
  id: string | null;
  sheetOpen: boolean;
  deleting: CharacterRecord | null;
};

const INSPECTOR_MEDIA = "(min-width: 1280px)";

const DEFAULT_FILTERS: CharactersFilters = {
  search: "",
  gender: "All identities",
  view: "grid",
};

export function useCharactersLibrary(initial: CharactersInitialData) {
  const [records, setRecords] = useState<CharacterRecord[]>(initial.records);
  const [filters, setFilters] = useState<CharactersFilters>(DEFAULT_FILTERS);
  const [selection, setSelection] = useState<Selection>({
    id: initial.records[0]?.id ?? null,
    sheetOpen: false,
    deleting: null,
  });
  const [feedback, setFeedback] = useState<{ busyId: string | null; toasts: ToastMessage[] }>({
    busyId: null,
    toasts: [],
  });

  const filtered = useMemo(
    () => filterCharacters(records, filters.search, filters.gender),
    [records, filters.search, filters.gender]
  );
  const selected = records.find((record) => record.id === selection.id) ?? null;

  const notify = useCallback((tone: ToastMessage["tone"], message: string) => {
    setFeedback((current) => ({
      ...current,
      toasts: [...current.toasts, { id: `${Date.now()}-${current.toasts.length}`, tone, message }],
    }));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setFeedback((current) => ({
      ...current,
      toasts: current.toasts.filter((toast) => toast.id !== id),
    }));
  }, []);

  const setBusy = (busyId: string | null) =>
    setFeedback((current) => ({ ...current, busyId }));

  async function confirmDelete(record: CharacterRecord) {
    setSelection((current) => ({ ...current, deleting: null }));
    setBusy(record.id);
    const result = await removeCharacter(record, records);
    setBusy(null);
    switch (result.kind) {
      case "deleted":
        setRecords(result.records);
        setSelection({ id: result.records[0]?.id ?? null, sheetOpen: false, deleting: null });
        notify("ok", "Character deleted");
        return;
      case "failed":
        notify("bad", result.error);
        if (result.records) setRecords(result.records);
        if (result.recovered) {
          setSelection((current) => ({ ...current, id: result.recovered?.id ?? current.id }));
        }
        return;
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  async function duplicate(record: CharacterRecord) {
    setBusy(record.id);
    const result = await duplicateCharacter(record);
    setBusy(null);
    switch (result.kind) {
      case "saved":
        setRecords(result.records);
        notify("ok", "Draft duplicated. Open it and save to make the identity reusable.");
        return;
      case "failed":
        notify("bad", result.error);
        return;
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  async function copyPrompt(record: CharacterRecord) {
    try {
      await copyCharacterPrompt(record);
      notify("ok", "Character prompt copied");
    } catch {
      notify("bad", "The prompt could not be copied to the clipboard");
    }
  }

  return {
    records,
    filtered,
    filters,
    selected,
    sheetOpen: selection.sheetOpen,
    deleting: selection.deleting,
    busyId: feedback.busyId,
    toasts: feedback.toasts,
    dismissToast,
    onFiltersChange: (next: Partial<CharactersFilters>) =>
      setFilters((current) => ({ ...current, ...next })),
    clearFilters: () =>
      setFilters((current) => ({ ...current, search: DEFAULT_FILTERS.search, gender: DEFAULT_FILTERS.gender })),
    select: (record: CharacterRecord) =>
      setSelection((current) => ({
        ...current,
        id: record.id,
        sheetOpen: !window.matchMedia(INSPECTOR_MEDIA).matches,
      })),
    closeSheet: () => setSelection((current) => ({ ...current, sheetOpen: false })),
    requestDelete: (record: CharacterRecord) =>
      setSelection((current) => ({ ...current, deleting: record })),
    cancelDelete: () => setSelection((current) => ({ ...current, deleting: null })),
    confirmDelete: (record: CharacterRecord) => void confirmDelete(record),
    duplicate: (record: CharacterRecord) => void duplicate(record),
    copyPrompt: (record: CharacterRecord) => void copyPrompt(record),
  };
}
