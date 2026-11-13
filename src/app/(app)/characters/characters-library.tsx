"use client";

import type { ReactNode } from "react";
import { Button, EmptyState, Icon, Segmented } from "@/components/workbench";
import { CharacterRow, CharacterTile } from "./characters-card";
import { GENDER_FILTER_OPTIONS } from "./characters-helpers";
import type { CharactersLibraryModel, CharactersView } from "./types";

export function CharactersLibrary({
  library,
  onClearFilters,
}: {
  library: CharactersLibraryModel;
  onClearFilters: () => void;
}) {
  const { filters, onFiltersChange } = library;
  return (
    <section
      aria-label="Character library"
      data-characters-library
      className="wb-panel min-w-0 gap-4 px-4 pb-5 pt-4 sm:px-6 sm:pt-[18px] xl:min-h-0 xl:flex-1"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <label className="wb-input-wrap h-9 min-w-0 flex-[1_1_160px] px-3 [&>svg]:size-4" data-characters-search>
          <Icon name="search" size={16} className="text-fg-muted" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => onFiltersChange({ search: event.target.value })}
            aria-label="Search characters"
            placeholder="Search characters"
            className="h-full min-w-0 flex-1 bg-transparent text-sm leading-[18px] text-fg outline-none placeholder:text-fg-muted"
          />
        </label>
        <Segmented
          label="Filter by identity"
          value={filters.gender as (typeof GENDER_FILTER_OPTIONS)[number]}
          onChange={(gender) => onFiltersChange({ gender })}
          options={GENDER_OPTIONS}
          className="gap-0 max-sm:order-last max-sm:w-full max-sm:[&>.wb-segment]:flex-1"
        />
        <Segmented
          label="Library view"
          value={filters.view}
          onChange={(view) => onFiltersChange({ view })}
          options={VIEW_OPTIONS}
          className="shrink-0 gap-0 [&>.wb-segment]:w-[30px] [&>.wb-segment>svg]:size-4 [&>.wb-segment[aria-pressed=false]>svg]:text-fg-muted [&>.wb-segment[aria-pressed=false]:hover>svg]:text-fg"
        />
      </div>
      <div className="min-h-0 xl:-mx-1 xl:flex-1 xl:-mt-1 xl:overflow-y-auto xl:px-1 xl:pb-1 xl:pt-1">
        <CharactersResults library={library} onClearFilters={onClearFilters} />
      </div>
    </section>
  );
}

function CharactersResults({
  library,
  onClearFilters,
}: {
  library: CharactersLibraryModel;
  onClearFilters: () => void;
}) {
  const { filtered, filters, selectedId, onSelect } = library;

  if (filtered.length === 0) {
    return (
      <EmptyState icon="search" title="No matching characters" className="min-h-[360px]">
        <Button variant="strong" onClick={onClearFilters}>
          Clear filters
        </Button>
      </EmptyState>
    );
  }

  if (filters.view === "list") {
    return (
      <div className="flex min-w-0 flex-col gap-1" data-characters-view="list">
        <div className="wb-table-head px-3.5" aria-hidden="true">
          <span className="w-10 shrink-0" />
          <span className="flex-1">Character</span>
          <span className="hidden w-[180px] shrink-0 md:block">Aesthetic</span>
          <span className="w-[96px] shrink-0">Status</span>
          <span className="hidden w-[88px] shrink-0 sm:block">Updated</span>
        </div>
        {filtered.map((record) => (
          <CharacterRow
            key={record.id}
            record={record}
            selected={record.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      data-characters-view="grid"
      className="grid grid-cols-2 gap-x-3.5 gap-y-[18px] sm:grid-cols-3 lg:grid-cols-4"
    >
      {filtered.map((record, index) => (
        <CharacterTile
          key={record.id}
          record={record}
          selected={record.id === selectedId}
          priority={index === 0}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function AllIdentitiesLabel() {
  return (
    <>
      <span className="sm:hidden">All</span>
      <span className="max-sm:hidden">All identities</span>
    </>
  );
}

const GENDER_OPTIONS = GENDER_FILTER_OPTIONS.map((value) => ({
  value,
  label: value === "All identities" ? <AllIdentitiesLabel /> : value,
}));

const VIEW_OPTIONS: Array<{ value: CharactersView; label: ReactNode; ariaLabel: string }> = [
  { value: "grid", label: <Icon name="grid" size={16} />, ariaLabel: "Grid view" },
  { value: "list", label: <Icon name="list" size={16} />, ariaLabel: "List view" },
];
