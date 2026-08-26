import type { CharacterRecord } from "@/lib/characters";

export type CharactersPageClientProps = {
  initialRecords: CharacterRecord[];
};

export type CharactersLibraryModel = {
  recordCount: number;
  filtered: CharacterRecord[];
  search: string;
  gender: string;
  view: "grid" | "list";
  menu: string | null;
  busyId: string | null;
  onSearchChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onViewChange: (view: "grid" | "list") => void;
  onSelect: (record: CharacterRecord) => void;
  onMenuToggle: (id: string | null) => void;
  onDuplicate: (record: CharacterRecord) => void;
  onRemove: (record: CharacterRecord) => void;
  onClearFilters: () => void;
};

export type CharacterCardModel = {
  record: CharacterRecord;
  view: "grid" | "list";
  menuOpen: boolean;
  busy: boolean;
  onSelect: (record: CharacterRecord) => void;
  onMenuToggle: (id: string | null) => void;
  onDuplicate: (record: CharacterRecord) => void;
  onRemove: (record: CharacterRecord) => void;
};
