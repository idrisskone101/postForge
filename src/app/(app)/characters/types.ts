import type { CharacterRecord } from "@/lib/characters";

export type CharactersInitialData = {
  records: CharacterRecord[];
  error: string | null;
};

export type CharactersView = "grid" | "list";

export type CharactersFilters = {
  search: string;
  gender: string;
  view: CharactersView;
};

export type CharactersLibraryModel = {
  recordCount: number;
  filtered: CharacterRecord[];
  filters: CharactersFilters;
  selectedId: string | null;
  onFiltersChange: (next: Partial<CharactersFilters>) => void;
  onSelect: (record: CharacterRecord) => void;
};

export type CharacterInspectorModel = {
  record: CharacterRecord;
  busy: boolean;
  onCopyPrompt: (record: CharacterRecord) => void;
  onDuplicate: (record: CharacterRecord) => void;
  onRequestDelete: (record: CharacterRecord) => void;
};

export type IdentityPackStatus = "queued" | "processing" | "completed" | "failed";

export type IdentityPackSummary = {
  status: IdentityPackStatus | string;
  error: string | null;
  images: Array<{ id: string; kind: "core" | "hairstyle" }>;
};
